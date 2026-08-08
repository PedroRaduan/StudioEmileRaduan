import { getPrisma } from "@/lib/db/prisma";
import { localDayRange, todayInTimezone } from "@/lib/date-time";

export async function getDashboardData() {
  const prisma = getPrisma();
  const today = todayInTimezone();
  const range = localDayRange(today);
  const now = new Date();
  const [todayAppointments, upcoming, pendingPayments, totalClients, recentCancellations, recoveryRequests, totalServices, availabilityRules, totalAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: range.start, lt: range.end }, status: { notIn: ["CANCELED", "NO_SHOW"] } },
      include: { client: { select: { fullName: true, preferredName: true, whatsapp: true } }, service: { select: { name: true, calendarColor: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      include: { client: { select: { fullName: true, preferredName: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: "asc" }, take: 5,
    }),
    prisma.payment.count({ where: { status: { in: ["PENDING", "AWAITING_CONFIRMATION", "OVERDUE"] } } }),
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.appointment.count({ where: { status: "CANCELED", cancelledAt: { gte: range.start, lt: range.end } } }),
    prisma.clientRecoveryRequest.findMany({ where: { status: "OPEN" }, include: { client: { select: { id: true, fullName: true, preferredName: true } } }, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.service.count({ where: { isActive: true } }),
    prisma.availabilityRule.count({ where: { isEnabled: true } }),
    prisma.appointment.count(),
  ]);

  return { today, todayAppointments, upcoming, pendingPayments, totalClients, recentCancellations, recoveryRequests, totalServices, availabilityRules, totalAppointments };
}
