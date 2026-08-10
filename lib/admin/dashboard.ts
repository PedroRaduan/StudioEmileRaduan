import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { dateKeyInTimezone, greetingInTimezone, localDayRange, todayInTimezone, weekdayInTimezone } from "@/lib/date-time";
import { requireStaff } from "@/lib/auth/session";
import { ACTIVE_APPOINTMENT_STATUSES, FUTURE_VALID_APPOINTMENT_STATUSES } from "@/lib/agenda/status";

const DAY = 24 * 60 * 60 * 1000;

export async function getDashboardData() {
  await requireStaff();
  const prisma = getPrisma();
  const settings = await prisma.studioSettings.findUnique({ where: { id: "studio" }, select: { timezone: true } });
  const timezone = settings?.timezone ?? "America/Sao_Paulo";
  const today = todayInTimezone(timezone);
  const range = localDayRange(today, timezone);
  const tomorrow = dateKeyInTimezone(new Date(range.end.getTime() + 12 * 60 * 60 * 1000), timezone);
  const tomorrowRange = localDayRange(tomorrow, timezone);
  const now = new Date();
  const returnWindowEnd = new Date(now.getTime() + 7 * DAY);
  const weekday = weekdayInTimezone(now, timezone);

  const [todayAppointments, upcoming, receipts, futureAppointments, resources, pendingPayments, totalClients, recentCancellations, tomorrowCancellations, recoveryRequests, returnOpportunities, totalServices, totalAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: range.start, lt: range.end } },
      select: { id: true, startsAt: true, endsAt: true, occupiedFrom: true, occupiedUntil: true, status: true, priceCents: true, client: { select: { fullName: true, preferredName: true } }, service: { select: { name: true, calendarColor: true } }, payment: { select: { amountPaidCents: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: now }, status: { in: FUTURE_VALID_APPOINTMENT_STATUSES } },
      select: { id: true, startsAt: true, client: { select: { fullName: true, preferredName: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: "asc" }, take: 5,
    }),
    prisma.payment.aggregate({ where: { confirmedAt: { gte: range.start, lt: range.end }, status: { in: ["PARTIALLY_PAID", "PAID"] } }, _sum: { amountPaidCents: true } }),
    prisma.appointment.findMany({ where: { startsAt: { gt: now }, status: { in: FUTURE_VALID_APPOINTMENT_STATUSES } }, select: { priceCents: true } }),
    prisma.calendarResource.findMany({ where: { isActive: true }, select: { availabilityRules: { where: { dayOfWeek: weekday, isEnabled: true }, select: { startsAtMinute: true, endsAtMinute: true, lunchStartsAt: true, lunchEndsAt: true } } } }),
    prisma.payment.count({ where: { status: { in: ["PENDING", "AWAITING_CONFIRMATION", "OVERDUE"] } } }),
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.appointment.count({ where: { status: "CANCELED", cancelledAt: { gte: range.start, lt: range.end } } }),
    prisma.appointment.findMany({ where: { status: "CANCELED", cancelledAt: { gte: now, lt: tomorrowRange.end }, startsAt: { gte: tomorrowRange.start, lt: tomorrowRange.end } }, select: { id: true, startsAt: true, priceCents: true, service: { select: { name: true } } }, take: 3, orderBy: { startsAt: "asc" } }),
    prisma.clientRecoveryRequest.findMany({ where: { status: "OPEN" }, include: { client: { select: { id: true, fullName: true, preferredName: true } } }, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.client.findMany({
      where: { deletedAt: null, returnRecommendedAt: { lte: returnWindowEnd }, appointments: { none: { startsAt: { gte: now }, status: { in: FUTURE_VALID_APPOINTMENT_STATUSES } } } },
      select: { id: true, fullName: true, preferredName: true, returnRecommendedAt: true },
      orderBy: { returnRecommendedAt: "asc" }, take: 5,
    }),
    prisma.service.count({ where: { isActive: true } }),
    prisma.appointment.count(),
  ]);

  const liveToday = todayAppointments.filter((item) => ACTIVE_APPOINTMENT_STATUSES.includes(item.status));
  const completedToday = todayAppointments.filter((item) => item.status === "COMPLETED").length;
  const remainingToday = liveToday.filter((item) => item.startsAt > now).length;
  const awaitingConfirmation = todayAppointments.filter((item) => ["SCHEDULED", "AWAITING_CONFIRMATION"].includes(item.status) && item.startsAt > now).length;
  const availableMinutes = resources.reduce((total, resource) => total + resource.availabilityRules.reduce((sum, rule) => sum + rule.endsAtMinute - rule.startsAtMinute - ((rule.lunchEndsAt ?? 0) - (rule.lunchStartsAt ?? 0)), 0), 0);
  const occupiedMinutes = liveToday.reduce((total, appointment) => total + Math.max(0, Math.round((appointment.occupiedUntil.getTime() - appointment.occupiedFrom.getTime()) / 60_000)), 0);
  const vacantMinutes = Math.max(0, availableMinutes - occupiedMinutes);
  const confirmedRevenueCents = receipts._sum.amountPaidCents ?? 0;
  const forecastRevenueCents = futureAppointments.reduce((total, appointment) => total + (appointment.priceCents ?? 0), 0);

  return {
    today,
    timezone,
    greeting: greetingInTimezone(timezone, now),
    todayAppointments,
    upcoming,
    pendingPayments,
    totalClients,
    recentCancellations,
    tomorrowCancellations,
    recoveryRequests,
    returnOpportunities,
    totalServices,
    availabilityRules: resources.reduce((total, resource) => total + resource.availabilityRules.length, 0),
    totalAppointments,
    metrics: {
      completedToday,
      remainingToday,
      awaitingConfirmation,
      confirmedRevenueCents,
      forecastRevenueCents,
      occupancyRate: availableMinutes ? Math.min(100, Math.round((occupiedMinutes / availableMinutes) * 100)) : 0,
      vacantMinutes,
      canceledToday: recentCancellations,
      noShowsToday: todayAppointments.filter((item) => item.status === "NO_SHOW").length,
    },
  };
}

export function formatMinutesForHumans(minutes: number) {
  if (!minutes) return "Sem janelas livres";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ""} livres` : `${rest} min livres`;
}
