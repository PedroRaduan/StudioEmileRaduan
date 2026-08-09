import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { localDayRange } from "@/lib/date-time";
import { requirePermission } from "@/lib/auth/session";
import { CURRENT_STUDIO_ID } from "@/lib/studio-config";

export async function getAgendaForDay(date: string) {
  await requirePermission("APPOINTMENTS_MANAGE");
  const prisma = getPrisma();
  const settings = await prisma.studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID }, select: { calendarSlotInterval: true, timezone: true } });
  const range = localDayRange(date, settings?.timezone);
  const databaseDate = new Date(`${date}T12:00:00.000Z`);
  const [appointments, blocks, resources, holiday] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: range.start, lt: range.end } },
      select: {
        id: true, startsAt: true, endsAt: true, durationMinutes: true, status: true, resourceId: true,
        client: { select: { id: true, fullName: true, preferredName: true } },
        service: { select: { name: true, calendarColor: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.scheduleBlock.findMany({
      where: { startsAt: { lt: range.end }, endsAt: { gt: range.start } },
      select: { id: true, title: true, note: true, startsAt: true, endsAt: true, resourceId: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.calendarResource.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true,
        availabilityRules: { select: { dayOfWeek: true, startsAtMinute: true, endsAtMinute: true, isEnabled: true } },
        availabilityExceptions: { where: { date: databaseDate }, select: { startsAtMinute: true, endsAtMinute: true, isClosed: true, note: true }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.holiday.findUnique({ where: { date: databaseDate }, select: { name: true, isClosed: true } }),
  ]);
  return { appointments, blocks, resource: resources[0] ?? null, resources, settings, holiday };
}

export async function getAgendaTimezone() {
  await requirePermission("APPOINTMENTS_MANAGE");
  const settings = await getPrisma().studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID }, select: { timezone: true } });
  return settings?.timezone;
}

export async function getAgendaForRange(startDate: string, endDate: string) {
  await requirePermission("APPOINTMENTS_MANAGE");
  const prisma = getPrisma();
  const settings = await prisma.studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID }, select: { timezone: true } });
  const start = localDayRange(startDate, settings?.timezone).start;
  const end = localDayRange(endDate, settings?.timezone).end;
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: start, lt: end } },
      select: {
        id: true, startsAt: true, endsAt: true, durationMinutes: true, status: true,
        client: { select: { id: true, fullName: true, preferredName: true } },
        service: { select: { name: true, calendarColor: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.scheduleBlock.findMany({
      where: { startsAt: { lt: end }, endsAt: { gt: start } },
      select: { id: true, title: true, note: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  return { appointments, blocks };
}

export async function getAppointmentFormData() {
  await requirePermission("APPOINTMENTS_MANAGE");
  const prisma = getPrisma();
  const [clients, services, resources, settings] = await Promise.all([
    prisma.client.findMany({ where: { deletedAt: null, status: { not: "BLOCKED" } }, select: { id: true, fullName: true, preferredName: true }, orderBy: { fullName: "asc" }, take: 250 }),
    prisma.service.findMany({ where: { isActive: true }, select: { id: true, name: true, durationMinutes: true, priceCents: true, promotionalPriceCents: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.calendarResource.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
    prisma.studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID }, select: { timezone: true } }),
  ]);
  return { clients, services, resources, timezone: settings?.timezone };
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
