import { randomUUID } from "node:crypto";
import { getSystemPrisma } from "../../lib/db/prisma";
import type { TenantContext } from "../../lib/tenancy/context";
import { dateInTimezone, todayInTimezone, weekdayInTimezone } from "../../lib/date-time";
import { ValidationFailure } from "./safety";

export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ValidationFailure(message);
}

export function futureDate(offset: number) {
  const date = new Date(`${todayInTimezone("America/Sao_Paulo")}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export async function createFixtures() {
  const suffix = randomUUID();
  return getSystemPrisma().$transaction(async (tx) => {
    const tenants = [];
    for (const label of ["a", "b"]) {
      const user = await tx.user.create({ data: { name: `Validação ${label}`, email: `${label}-${suffix}@example.invalid`, passwordHash: "!validation-no-login", isActive: false } });
      const organization = await tx.organization.create({ data: { name: `Validação ${label}`, slug: `validation-${label}-${suffix}` } });
      const membership = await tx.organizationMembership.create({ data: { userId: user.id, organizationId: organization.id, role: "OWNER" } });
      const organizationId = organization.id;
      await tx.studioSettings.create({ data: { organizationId, timezone: "America/Sao_Paulo" } });
      const resource = await tx.calendarResource.create({ data: { organizationId, name: "Agenda de validação" } });
      // Every weekday is configured: fixtures never depend on today's weekday.
      await tx.availabilityRule.createMany({ data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        organizationId, resourceId: resource.id, dayOfWeek, startsAtMinute: 480, endsAtMinute: 1200, isEnabled: true,
      })) });
      const service = await tx.service.create({ data: {
        organizationId, name: "Serviço de validação", durationMinutes: 60, priceCents: 10000,
        preparationMinutes: 10, cleanupMinutes: 10,
      } });
      const clients = [];
      for (let i = 0; i < 3; i++) clients.push(await tx.client.create({ data: { organizationId, fullName: `Cliente de validação ${i}` } }));
      const context: TenantContext = { organizationId, membershipId: membership.id, role: "OWNER" };
      tenants.push({ user, organization, membership, resource, service, clients, context });
    }
    return tenants;
  }, { timeout: 30_000 });
}

export type FixtureTenant = Awaited<ReturnType<typeof createFixtures>>[number];

export function appointmentInput(tenant: FixtureTenant, date = futureDate(2), time = "15:00", client = 0) {
  return { clientId: tenant.clients[client].id, serviceId: tenant.service.id, resourceId: tenant.resource.id,
    ownerId: tenant.user.id, requestKey: randomUUID(), date, time };
}

export function rawAppointment(tenant: FixtureTenant, date: string) {
  const startsAt = dateInTimezone(date, "15:00", "America/Sao_Paulo");
  ensure(weekdayInTimezone(startsAt, "America/Sao_Paulo") >= 0, "Data da fixture inválida.");
  return { organizationId: tenant.organization.id, clientId: tenant.clients[0].id, resourceId: tenant.resource.id,
    serviceId: tenant.service.id, code: randomUUID(), startsAt,
    endsAt: new Date(startsAt.getTime() + 3600000), occupiedFrom: startsAt,
    occupiedUntil: new Date(startsAt.getTime() + 3600000), durationMinutes: 60 };
}

export async function cleanupFixtures(tenants: FixtureTenant[]) {
  const organizationIds = tenants.map((tenant) => tenant.organization.id);
  const userIds = tenants.map((tenant) => tenant.user.id);
  ensure(organizationIds.length === 2 && organizationIds.every(Boolean), "Limpeza recusada: fixtures incompletas.");
  const where = { organizationId: { in: organizationIds } };
  await getSystemPrisma().$transaction(async (tx) => {
    // Explicit children first; scope is restricted to IDs created by this run.
    await tx.inventoryMovement.deleteMany({ where });
    await tx.inventoryItem.deleteMany({ where });
    await tx.expense.deleteMany({ where });
    await tx.payment.deleteMany({ where });
    await tx.appointmentEvent.deleteMany({ where });
    await tx.appointment.deleteMany({ where });
    await tx.auditLog.deleteMany({ where });
    await tx.availabilityRule.deleteMany({ where });
    await tx.client.deleteMany({ where });
    await tx.service.deleteMany({ where });
    await tx.calendarResource.deleteMany({ where });
    await tx.studioSettings.deleteMany({ where });
    await tx.organizationMembership.deleteMany({ where });
    await tx.organization.deleteMany({ where: { id: { in: organizationIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  }, { timeout: 30_000 });
  ensure(await getSystemPrisma().organization.count({ where: { id: { in: organizationIds } } }) === 0, "A limpeza não removeu todas as fixtures.");
}
