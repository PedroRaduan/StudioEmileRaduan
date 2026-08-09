import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { localDayRange } from "@/lib/date-time";
import { requirePermission } from "@/lib/auth/session";

export async function getAgendaForDay(date: string) {
  await requirePermission("APPOINTMENTS_MANAGE");
  const prisma = getPrisma();
  const range = localDayRange(date);
  const [appointments, blocks, resources] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: range.start, lt: range.end } },
      include: { client: { select: { id: true, fullName: true, preferredName: true, whatsapp: true } }, service: { select: { name: true, calendarColor: true, durationMinutes: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.scheduleBlock.findMany({ where: { startsAt: { lt: range.end }, endsAt: { gt: range.start } }, orderBy: { startsAt: "asc" } }),
    prisma.calendarResource.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return { appointments, blocks, resources };
}

export async function getAgendaForRange(startDate: string, endDate: string) {
  await requirePermission("APPOINTMENTS_MANAGE");
  const prisma = getPrisma();
  const start = localDayRange(startDate).start;
  const end = localDayRange(endDate).end;
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({ where: { startsAt: { gte: start, lt: end } }, include: { client: { select: { id: true, fullName: true, preferredName: true, whatsapp: true } }, service: { select: { name: true, calendarColor: true, durationMinutes: true } } }, orderBy: { startsAt: "asc" } }),
    prisma.scheduleBlock.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start } }, orderBy: { startsAt: "asc" } }),
  ]);
  return { appointments, blocks };
}

export async function getAppointmentFormData() {
  await requirePermission("APPOINTMENTS_MANAGE");
  const prisma = getPrisma();
  const [clients, services, resources] = await Promise.all([
    prisma.client.findMany({ where: { deletedAt: null, status: { not: "BLOCKED" } }, select: { id: true, fullName: true, preferredName: true }, orderBy: { fullName: "asc" }, take: 250 }),
    prisma.service.findMany({ where: { isActive: true }, select: { id: true, name: true, durationMinutes: true, priceCents: true, promotionalPriceCents: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.calendarResource.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return { clients, services, resources };
}

export async function getAppointment(id: string) {
  await requirePermission("APPOINTMENTS_MANAGE");
  const prisma = getPrisma();
  const [appointment, messageLogs] = await Promise.all([prisma.appointment.findUnique({
    where: { id },
    include: { client: true, service: true, resource: true, payment: { include: { events: { orderBy: { createdAt: "desc" } } } }, events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } } },
  }), prisma.messageLog.findMany({ where: { appointmentId: id }, orderBy: { createdAt: "desc" }, take: 5 })]);
  return appointment ? { ...appointment, messageLogs } : null;
}
