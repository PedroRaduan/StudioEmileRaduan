import "server-only";
import { localDayRange } from "@/lib/date-time";
import { requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export async function getReports(from: string, to: string) {
  await requirePermission("REPORTS_VIEW");
  const prisma = getPrisma();
  const startsAt = localDayRange(from).start;
  const endsAt = localDayRange(to).end;
  const [appointments, newClients, recentAudit] = await Promise.all([
    prisma.appointment.findMany({ where: { startsAt: { gte: startsAt, lt: endsAt } }, select: { status: true, priceCents: true, payment: { select: { amountDueCents: true, amountPaidCents: true, status: true } }, service: { select: { name: true } } } }),
    prisma.client.count({ where: { deletedAt: null, createdAt: { gte: startsAt, lt: endsAt } } }),
    prisma.auditLog.findMany({ where: { createdAt: { gte: startsAt, lt: endsAt } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const count = (status: string) => appointments.filter((item) => item.status === status).length;
  const completed = count("COMPLETED");
  const noShows = count("NO_SHOW");
  const canceled = count("CANCELED");
  const operationalBase = completed + noShows;
  const receivedCents = appointments.reduce((total, item) => total + (item.payment?.amountPaidCents ?? 0), 0);
  const expectedCents = appointments.filter((item) => item.status !== "CANCELED").reduce((total, item) => total + (item.priceCents ?? 0), 0);
  const pendingCents = appointments.filter((item) => item.status !== "CANCELED").reduce((total, item) => total + Math.max(0, (item.payment?.amountDueCents ?? item.priceCents ?? 0) - (item.payment?.amountPaidCents ?? 0)), 0);
  const services = new Map<string, number>();
  appointments.filter((item) => item.status !== "CANCELED").forEach((item) => services.set(item.service.name, (services.get(item.service.name) ?? 0) + 1));
  return {
    total: appointments.length,
    completed,
    noShows,
    canceled,
    scheduled: appointments.length - completed - noShows - canceled,
    attendanceRate: operationalBase ? Math.round((completed / operationalBase) * 100) : 0,
    newClients,
    receivedCents,
    expectedCents,
    pendingCents,
    services: [...services.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8),
    recentAudit,
  };
}
