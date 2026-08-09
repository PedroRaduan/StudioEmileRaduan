import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { dateKeyInTimezone, localDayRange, todayInTimezone } from "@/lib/date-time";
import { requirePermission } from "@/lib/auth/session";
import { FUTURE_VALID_APPOINTMENT_STATUSES } from "@/lib/agenda/status";

const DAY = 24 * 60 * 60 * 1000;

export async function getOperationalOpportunities() {
  await requirePermission("CLIENTS_MANAGE");
  const prisma = getPrisma();
  const settings = await prisma.studioSettings.findUnique({ where: { id: "studio" }, select: { timezone: true } });
  const timezone = settings?.timezone ?? "America/Sao_Paulo";
  const now = new Date();
  const today = todayInTimezone(timezone);
  const tomorrowRange = localDayRange(dateKeyInTimezone(new Date(now.getTime() + DAY), timezone), timezone);
  const returnWindowEnd = new Date(now.getTime() + 7 * DAY);
  const cancellationCutoff = new Date(now.getTime() - 60 * DAY);

  const [returnsDue, recentCancellations, newClients, birthdays, tomorrowAppointments] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null, returnRecommendedAt: { lte: returnWindowEnd }, appointments: { none: { startsAt: { gte: now }, status: { in: FUTURE_VALID_APPOINTMENT_STATUSES } } } },
      select: { id: true, fullName: true, preferredName: true, whatsapp: true, returnRecommendedAt: true, lastAppointmentAt: true },
      orderBy: { returnRecommendedAt: "asc" }, take: 30,
    }),
    prisma.appointment.findMany({
      where: { status: "CANCELED", cancelledAt: { gte: cancellationCutoff } },
      select: { id: true, clientId: true, startsAt: true, cancelledAt: true, priceCents: true, client: { select: { id: true, fullName: true, preferredName: true } }, service: { select: { name: true } } },
      orderBy: { cancelledAt: "desc" }, take: 100,
    }),
    prisma.client.findMany({
      where: { deletedAt: null, firstAppointmentAt: { gte: new Date(now.getTime() - 45 * DAY), lt: now } },
      select: { id: true, fullName: true, preferredName: true, firstAppointmentAt: true, _count: { select: { appointments: { where: { status: "COMPLETED" } } } } },
      orderBy: { firstAppointmentAt: "asc" }, take: 50,
    }),
    prisma.client.findMany({ where: { deletedAt: null, birthDate: { not: null } }, select: { id: true, fullName: true, preferredName: true, birthDate: true }, take: 1000 }),
    prisma.appointment.findMany({ where: { startsAt: { gte: tomorrowRange.start, lt: tomorrowRange.end }, status: { in: FUTURE_VALID_APPOINTMENT_STATUSES } }, select: { id: true, startsAt: true, priceCents: true, service: { select: { name: true } } }, orderBy: { startsAt: "asc" } }),
  ]);

  const canceledClientIds = [...new Set(recentCancellations.map((appointment) => appointment.clientId))];
  const rebooked = canceledClientIds.length ? await prisma.appointment.findMany({ where: { clientId: { in: canceledClientIds }, startsAt: { gt: now }, status: { in: FUTURE_VALID_APPOINTMENT_STATUSES } }, select: { clientId: true } }) : [];
  const rebookedIds = new Set(rebooked.map((appointment) => appointment.clientId));
  const [, todayMonth, todayDay] = today.split("-").map(Number);

  return {
    today,
    returnsDue,
    canceledWithoutRebooking: recentCancellations.filter((appointment) => !rebookedIds.has(appointment.clientId)).slice(0, 20),
    newWithoutSecondVisit: newClients.filter((client) => client._count.appointments <= 1).slice(0, 20),
    birthdays: birthdays.filter((client) => client.birthDate?.getUTCMonth() === todayMonth - 1 && client.birthDate?.getUTCDate() === todayDay).slice(0, 20),
    tomorrowAppointments,
  };
}
