import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma, getSystemPrisma } from "@/lib/db/prisma";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/agenda/status";
import { sha256 } from "@/lib/security/hash";
import { requireTenantContext } from "@/lib/tenancy/context";
import { matchesWaitlistPreference } from "@/lib/admin/waitlist-preferences";

const OFFER_MINUTES = 20;

export class WaitlistError extends Error {}

export async function getWaitlistDashboard() {
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  await prisma.waitlistOffer.updateMany({ where: { status: "PENDING", expiresAt: { lte: new Date() } }, data: { status: "EXPIRED", resolvedAt: new Date() } });
  const [entries, recentCancellations, clients, services, resources, settings] = await Promise.all([
    prisma.waitlistEntry.findMany({ where: { status: { in: ["WAITING", "MATCHED", "OFFERED"] } }, orderBy: { createdAt: "asc" }, take: 100 }),
    prisma.appointment.findMany({ where: { status: "CANCELED", startsAt: { gt: new Date() }, cancelledAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, select: { id: true, clientId: true, serviceId: true, resourceId: true, startsAt: true, endsAt: true, occupiedFrom: true, occupiedUntil: true, service: { select: { name: true } } }, orderBy: { cancelledAt: "desc" }, take: 30 }),
    prisma.client.findMany({ where: { deletedAt: null }, select: { id: true, fullName: true, preferredName: true }, orderBy: { fullName: "asc" }, take: 250 }),
    prisma.service.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.calendarResource.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.studioSettings.findUnique({ where: { organizationId }, select: { timezone: true } }),
  ]);
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const byCancellation = recentCancellations.map((appointment) => ({
    ...appointment,
    candidates: entries.filter((entry) => entry.status !== "OFFERED" && entry.serviceId === appointment.serviceId && (!entry.preferredResourceId || entry.preferredResourceId === appointment.resourceId) && matchesWaitlistPreference(entry, appointment.startsAt, settings?.timezone ?? "America/Sao_Paulo")).map((entry) => ({
      ...entry,
      client: clientMap.get(entry.clientId),
    })),
  }));
  return { entries: entries.map((entry) => ({ ...entry, client: clientMap.get(entry.clientId), service: serviceMap.get(entry.serviceId) })), byCancellation, clients, services, resources };
}

export async function createWaitlistEntry(input: {
  clientId: string;
  serviceId: string;
  preferredResourceId?: string | null;
  preferredDays: number[];
  preferredPeriod: "ANY" | "MORNING" | "AFTERNOON" | "EVENING";
  earliestDate?: Date | null;
  latestDate?: Date | null;
  note?: string | null;
  actorUserId: string;
}) {
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  const [client, service, resource] = await Promise.all([
    prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null, status: { not: "BLOCKED" } }, select: { id: true } }),
    prisma.service.findFirst({ where: { id: input.serviceId, isActive: true }, select: { id: true } }),
    input.preferredResourceId ? prisma.calendarResource.findFirst({ where: { id: input.preferredResourceId, isActive: true }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!client || !service || (input.preferredResourceId && !resource)) throw new WaitlistError("Cliente, serviço ou profissional não está disponível.");
  return prisma.$transaction(async (tx) => {
    const entry = await tx.waitlistEntry.create({ data: { ...input, organizationId } });
    await tx.auditLog.create({ data: { organizationId, userId: input.actorUserId, action: "WAITLIST_ENTRY_CREATED", entityType: "WaitlistEntry", entityId: entry.id } });
    return entry;
  });
}

export async function offerCancellationToWaitlist(input: { appointmentId: string; waitlistEntryId: string; actorUserId: string; origin: string }) {
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  const rawToken = randomBytes(32).toString("base64url");
  const offer = await prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.waitlistOffer.updateMany({ where: { status: "PENDING", expiresAt: { lte: now } }, data: { status: "EXPIRED", resolvedAt: now } });
    const [appointment, entry] = await Promise.all([
      tx.appointment.findFirst({ where: { id: input.appointmentId, status: "CANCELED", startsAt: { gt: now } } }),
      tx.waitlistEntry.findFirst({ where: { id: input.waitlistEntryId, status: { in: ["WAITING", "MATCHED"] } } }),
    ]);
    if (!appointment || !entry || entry.serviceId !== appointment.serviceId || (entry.preferredResourceId && entry.preferredResourceId !== appointment.resourceId)) throw new WaitlistError("Esta vaga não é compatível com a preferência da lista de espera.");
    const settings = await tx.studioSettings.findUnique({ where: { organizationId }, select: { timezone: true } });
    if (!matchesWaitlistPreference(entry, appointment.startsAt, settings?.timezone ?? "America/Sao_Paulo")) throw new WaitlistError("A faixa de horário da cliente não é compatível com esta vaga.");
    const [conflict, existingOffer] = await Promise.all([
      tx.appointment.findFirst({ where: { resourceId: appointment.resourceId, status: { in: ACTIVE_APPOINTMENT_STATUSES }, occupiedFrom: { lt: appointment.occupiedUntil }, occupiedUntil: { gt: appointment.occupiedFrom } } }),
      tx.waitlistOffer.findFirst({ where: { resourceId: appointment.resourceId, status: "PENDING", occupiedFrom: { lt: appointment.occupiedUntil }, occupiedUntil: { gt: appointment.occupiedFrom } } }),
    ]);
    if (conflict || existingOffer) throw new WaitlistError("A vaga não está mais livre para uma oferta segura.");
    const created = await tx.waitlistOffer.create({ data: {
      organizationId, waitlistEntryId: entry.id, sourceAppointmentId: appointment.id, resourceId: appointment.resourceId,
      serviceId: appointment.serviceId, clientId: entry.clientId, startsAt: appointment.startsAt, endsAt: appointment.endsAt,
      occupiedFrom: appointment.occupiedFrom, occupiedUntil: appointment.occupiedUntil, tokenHash: sha256(rawToken),
      expiresAt: new Date(now.getTime() + OFFER_MINUTES * 60_000), createdByUserId: input.actorUserId,
    } });
    await tx.waitlistEntry.update({ where: { id: entry.id }, data: { status: "OFFERED", offeredAt: now } });
    await tx.auditLog.create({ data: { organizationId, userId: input.actorUserId, action: "WAITLIST_OFFER_CREATED", entityType: "WaitlistOffer", entityId: created.id, after: { appointmentId: appointment.id, expiresAt: created.expiresAt.toISOString() } } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
  return { offer, link: `${input.origin}/lista-espera/oferta/${rawToken}` };
}

export async function acceptWaitlistOffer(rawToken: string) {
  const prisma = getSystemPrisma();
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const offer = await tx.waitlistOffer.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (!offer || offer.status !== "PENDING" || offer.expiresAt <= now) throw new WaitlistError("Esta oferta expirou ou já foi utilizada.");
    const [entry, client, service, resource, conflict] = await Promise.all([
      tx.waitlistEntry.findFirst({ where: { id: offer.waitlistEntryId, organizationId: offer.organizationId, status: "OFFERED" } }),
      tx.client.findFirst({ where: { id: offer.clientId, organizationId: offer.organizationId, deletedAt: null, status: { not: "BLOCKED" } } }),
      tx.service.findFirst({ where: { id: offer.serviceId, organizationId: offer.organizationId, isActive: true } }),
      tx.calendarResource.findFirst({ where: { id: offer.resourceId, organizationId: offer.organizationId, isActive: true } }),
      tx.appointment.findFirst({ where: { organizationId: offer.organizationId, resourceId: offer.resourceId, status: { in: ACTIVE_APPOINTMENT_STATUSES }, occupiedFrom: { lt: offer.occupiedUntil }, occupiedUntil: { gt: offer.occupiedFrom } } }),
    ]);
    if (!entry || !client || !service || !resource || conflict) throw new WaitlistError("A vaga não está mais disponível. Fale com o estabelecimento.");
    const priceCents = service.promotionalPriceCents ?? service.priceCents;
    const appointment = await tx.appointment.create({ data: {
      organizationId: offer.organizationId, code: `WL-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`,
      requestKey: `waitlist:${offer.id}`, clientId: client.id, serviceId: service.id, resourceId: resource.id,
      startsAt: offer.startsAt, endsAt: offer.endsAt, occupiedFrom: offer.occupiedFrom, occupiedUntil: offer.occupiedUntil,
      durationMinutes: service.durationMinutes, priceCents, paymentStatus: priceCents === null ? "NOT_REQUIRED" : "PENDING", status: "CONFIRMED",
    } });
    await Promise.all([
      tx.payment.create({ data: { organizationId: offer.organizationId, appointmentId: appointment.id, clientId: client.id, amountDueCents: priceCents, status: appointment.paymentStatus } }),
      tx.appointmentEvent.create({ data: { organizationId: offer.organizationId, appointmentId: appointment.id, type: "WAITLIST_OFFER_ACCEPTED", channel: "WAITLIST", nextValue: { offerId: offer.id } } }),
      tx.waitlistOffer.update({ where: { id: offer.id }, data: { status: "ACCEPTED", acceptedAppointmentId: appointment.id, resolvedAt: now } }),
      tx.waitlistEntry.update({ where: { id: entry.id }, data: { status: "ACCEPTED", acceptedAt: now } }),
      tx.auditLog.create({ data: { organizationId: offer.organizationId, action: "WAITLIST_OFFER_ACCEPTED", entityType: "WaitlistOffer", entityId: offer.id, after: { appointmentId: appointment.id } } }),
    ]);
    return appointment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}

export function isWaitlistToken(value: string) {
  return /^[A-Za-z0-9_-]{40,60}$/.test(value);
}
