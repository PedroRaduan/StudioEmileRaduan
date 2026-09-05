import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { greetingInTimezone, localDayRange, todayInTimezone } from "@/lib/date-time";
import { requireStaff } from "@/lib/auth/session";
import { ACTIVE_APPOINTMENT_STATUSES, FUTURE_VALID_APPOINTMENT_STATUSES } from "@/lib/agenda/status";

export async function getDashboardData() {
  const user = await requireStaff();
  const prisma = getPrisma();
  const settings = await prisma.studioSettings.findUnique({ where: { organizationId: user.organizationId }, select: { timezone: true } });
  const timezone = settings?.timezone ?? "America/Sao_Paulo";
  const today = todayInTimezone(timezone);
  const range = localDayRange(today, timezone);
  const now = new Date();
  const [todayAppointments, upcoming] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: range.start, lt: range.end }, status: { not: "CANCELED" } },
      select: { id: true, startsAt: true, status: true, client: { select: { fullName: true, preferredName: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: range.end }, status: { in: FUTURE_VALID_APPOINTMENT_STATUSES } },
      select: { id: true, startsAt: true, client: { select: { fullName: true, preferredName: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: "asc" }, take: 5,
    }),
  ]);
  return {
    today, timezone, greeting: greetingInTimezone(timezone, now), todayAppointments, upcoming,
    completedToday: todayAppointments.filter((item) => item.status === "COMPLETED").length,
    remainingToday: todayAppointments.filter((item) => ACTIVE_APPOINTMENT_STATUSES.includes(item.status) && item.startsAt > now).length,
  };
}
