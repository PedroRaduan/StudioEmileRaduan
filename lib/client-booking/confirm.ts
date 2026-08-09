import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { Prisma } from "@/app/generated/prisma/client";
import { hashIp } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";
import { BOOKING_HOLD_COOKIE } from "./availability";
import { BookingError } from "./hold";
import { isSchedulingConflictError } from "@/lib/agenda/conflict-error";

export async function confirmBookingHold(input: { clientId: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(BOOKING_HOLD_COOKIE)?.value;
  if (!token) throw new BookingError("Sua reserva temporária expirou. Escolha o horário novamente.");
  const requestHeaders = await headers();
  const prisma = getPrisma();

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const hold = await tx.bookingHold.findUnique({ where: { tokenHash: sha256(token) }, include: { service: true } });
      if (!hold || hold.status !== "ACTIVE" || hold.expiresAt <= now) throw new BookingError("Sua reserva temporária expirou. Escolha o horário novamente.");
      if (hold.clientId && hold.clientId !== input.clientId) throw new BookingError("Esta reserva não pertence à sua conta.");
      const client = await tx.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
      const settings = await tx.studioSettings.findUnique({ where: { id: "studio" } });
      if (!client || client.status === "BLOCKED") throw new BookingError("Não foi possível concluir on-line. Entre em contato com o studio.");
      const conflict = await tx.appointment.findFirst({ where: { resourceId: hold.resourceId, status: { in: ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE"] }, occupiedFrom: { lt: hold.occupiedUntil }, occupiedUntil: { gt: hold.occupiedFrom } } });
      if (conflict) throw new BookingError("Este horário acabou de ser ocupado. Escolha outra opção.");

      const priceCents = hold.service.promotionalPriceCents ?? hold.service.priceCents;
      const paymentStatus = priceCents === null ? "NOT_REQUIRED" as const : "PENDING" as const;
      const depositAmountCents = hold.service.depositRequired && hold.service.depositValue && priceCents !== null
        ? hold.service.depositType === "PERCENT" ? Math.round(priceCents * hold.service.depositValue / 100) : hold.service.depositValue
        : null;
      const documents = await tx.document.findMany({ where: { isActive: true, type: { in: ["PRIVACY", "PROCEDURE"] } }, orderBy: { publishedAt: "desc" } });
      const latestDocuments = [...new Map(documents.map((document) => [document.type, document])).values()];
      const created = await tx.appointment.create({
        data: {
          code: appointmentCode(),
          requestKey: `hold:${hold.id}`,
          clientId: client.id,
          serviceId: hold.serviceId,
          resourceId: hold.resourceId,
          createdByUserId: null,
          startsAt: hold.startsAt,
          endsAt: hold.endsAt,
          occupiedFrom: hold.occupiedFrom,
          occupiedUntil: hold.occupiedUntil,
          durationMinutes: hold.service.durationMinutes,
          priceCents,
          paymentStatus,
          events: { create: { type: "CREATED", channel: "CLIENT", nextValue: { startsAt: hold.startsAt.toISOString(), serviceId: hold.serviceId, acceptedDocumentIds: latestDocuments.map((document) => document.id), policySnapshot: hold.service.cancellationPolicy ?? settings?.cancellationPolicy ?? null } } },
          payment: { create: { clientId: client.id, amountDueCents: priceCents, status: paymentStatus, depositRequired: hold.service.depositRequired, depositAmountCents } },
        },
      });
      if (latestDocuments.length) await tx.consent.createMany({ data: latestDocuments.map((document) => ({ clientId: client.id, documentId: document.id, granted: true, ipHash: hashIp(requestHeaders.get("x-forwarded-for")), device: requestHeaders.get("user-agent")?.slice(0, 500) })) });
      await tx.bookingHold.update({ where: { id: hold.id }, data: { status: "CONVERTED", clientId: client.id, convertedAt: now } });
      await tx.client.update({ where: { id: client.id }, data: { firstAppointmentAt: client.firstAppointmentAt ?? hold.startsAt } });
      await tx.auditLog.create({ data: { action: "CLIENT_APPOINTMENT_CREATED", entityType: "Appointment", entityId: created.id, ipHash: hashIp(requestHeaders.get("x-forwarded-for")) } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
    cookieStore.delete(BOOKING_HOLD_COOKIE);
    return appointment;
  } catch (error) {
    if (error instanceof BookingError) throw error;
    if (isSchedulingConflictError(error)) throw new BookingError("Este horário acabou de ser ocupado. Escolha outra opção.");
    throw error;
  }
}

function appointmentCode() {
  return `ERBF-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}
