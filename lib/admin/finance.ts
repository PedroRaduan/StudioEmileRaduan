import "server-only";

import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/tenancy/context";
import { calculateDailyExpected } from "@/lib/admin/finance-calculations";

export class FinanceError extends Error {}

export async function getFinancialOverview() {
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const [expenses, payments, packages, commissions, closes] = await Promise.all([
    prisma.expense.findMany({ where: { deletedAt: null }, orderBy: { occurredAt: "desc" }, take: 20 }),
    prisma.payment.findMany({ where: { confirmedAt: { gte: dayStart, lt: dayEnd }, status: { in: ["PAID", "PARTIALLY_PAID"] } }, select: { amountPaidCents: true } }),
    prisma.servicePackage.findMany({ where: { status: "ACTIVE" }, orderBy: { purchasedAt: "desc" }, take: 20 }),
    prisma.commissionEntry.findMany({ where: { status: { in: ["PENDING", "APPROVED"] } }, orderBy: { generatedAt: "desc" }, take: 20 }),
    prisma.dailyCashClose.findMany({ orderBy: { date: "desc" }, take: 7 }),
  ]);
  const todayExpenses = expenses.filter((expense) => expense.status === "PAID" && expense.occurredAt >= dayStart && expense.occurredAt < dayEnd).reduce((total, expense) => total + expense.amountCents, 0);
  const todayRevenue = payments.reduce((total, payment) => total + payment.amountPaidCents, 0);
  const pendingCommissionCents = commissions.reduce((total, entry) => total + entry.amountCents, 0);
  return { organizationId, expenses, packages, commissions, closes, todayRevenue, todayExpenses, pendingCommissionCents };
}

export async function createExpense(input: { category: string; description: string; amountCents: number; occurredAt: Date; paymentMethod?: "CASH" | "PIX" | "CARD" | "TRANSFER"; note?: string | null; actorUserId: string }) {
  if (input.amountCents <= 0) throw new FinanceError("Informe um valor de despesa maior que zero.");
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({ data: { ...input, organizationId, status: "PAID" } });
    await tx.auditLog.create({ data: { organizationId, userId: input.actorUserId, action: "EXPENSE_CREATED", entityType: "Expense", entityId: expense.id, after: { amountCents: expense.amountCents, category: expense.category } } });
    return expense;
  });
}

export async function createServicePackage(input: { clientId: string; serviceId: string; name: string; totalSessions: number; priceCents?: number | null; expiresAt?: Date | null; note?: string | null; actorUserId: string }) {
  if (!Number.isInteger(input.totalSessions) || input.totalSessions < 1 || input.totalSessions > 999) throw new FinanceError("Informe uma quantidade de sessões válida.");
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  const [client, service] = await Promise.all([
    prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null }, select: { id: true } }),
    prisma.service.findFirst({ where: { id: input.serviceId, isActive: true }, select: { id: true } }),
  ]);
  if (!client || !service) throw new FinanceError("Cliente ou serviço não está disponível para o pacote.");
  return prisma.$transaction(async (tx) => {
    const servicePackage = await tx.servicePackage.create({ data: { ...input, organizationId, remainingSessions: input.totalSessions } });
    await tx.auditLog.create({ data: { organizationId, userId: input.actorUserId, action: "SERVICE_PACKAGE_CREATED", entityType: "ServicePackage", entityId: servicePackage.id, after: { sessions: servicePackage.totalSessions } } });
    return servicePackage;
  });
}

export async function closeDailyCash(input: { date: Date; actualCents: number; note?: string | null; actorUserId: string }) {
  if (!Number.isInteger(input.actualCents) || input.actualCents < 0) throw new FinanceError("Informe o valor contado em centavos corretamente.");
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  const start = new Date(input.date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.$transaction(async (tx) => {
    const [payments, expenses] = await Promise.all([
      tx.payment.findMany({ where: { confirmedAt: { gte: start, lt: end }, status: { in: ["PAID", "PARTIALLY_PAID"] } }, select: { amountPaidCents: true } }),
      tx.expense.findMany({ where: { occurredAt: { gte: start, lt: end }, status: "PAID", deletedAt: null }, select: { amountCents: true } }),
    ]);
    const expectedCents = calculateDailyExpected(payments.map((payment) => payment.amountPaidCents), expenses.map((expense) => expense.amountCents));
    const close = await tx.dailyCashClose.upsert({ where: { organizationId_date: { organizationId, date: start } }, create: { organizationId, date: start, status: "FINALIZED", expectedCents, actualCents: input.actualCents, differenceCents: input.actualCents - expectedCents, note: input.note, closedByUserId: input.actorUserId, closedAt: new Date() }, update: { status: "FINALIZED", expectedCents, actualCents: input.actualCents, differenceCents: input.actualCents - expectedCents, note: input.note, closedByUserId: input.actorUserId, closedAt: new Date() } });
    await tx.auditLog.create({ data: { organizationId, userId: input.actorUserId, action: "DAILY_CASH_CLOSED", entityType: "DailyCashClose", entityId: close.id, after: { expectedCents, actualCents: input.actualCents } } });
    return close;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function completeAppointmentWithFinance(input: { appointmentId: string; actorUserId: string }) {
  const organizationId = (await requireTenantContext()).organizationId;
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({ where: { id: input.appointmentId }, include: { service: true, resource: { select: { membershipId: true } }, payment: true } });
    if (!appointment) throw new FinanceError("Agendamento não encontrado.");
    if (appointment.status === "CANCELED") throw new FinanceError("Um atendimento cancelado não pode ser concluído.");
    if (appointment.status === "COMPLETED") return appointment;
    const now = new Date();
    const completed = await tx.appointment.update({ where: { id: appointment.id }, data: { status: "COMPLETED", completedAt: now } });
    await tx.client.update({ where: { id: appointment.clientId }, data: { lastAppointmentAt: now, returnRecommendedAt: appointment.service.recommendedReturnDays ? new Date(now.getTime() + appointment.service.recommendedReturnDays * 24 * 60 * 60 * 1000) : null, status: "ACTIVE" } });
    const servicePackage = await tx.servicePackage.findFirst({ where: { clientId: appointment.clientId, serviceId: appointment.serviceId, status: "ACTIVE", remainingSessions: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, orderBy: [{ expiresAt: "asc" }, { purchasedAt: "asc" }] });
    if (servicePackage) {
      const decremented = await tx.servicePackage.updateMany({ where: { id: servicePackage.id, status: "ACTIVE", remainingSessions: { gt: 0 } }, data: { remainingSessions: { decrement: 1 } } });
      if (decremented.count === 1) {
        const current = await tx.servicePackage.findUnique({ where: { id: servicePackage.id }, select: { remainingSessions: true } });
        if (current?.remainingSessions === 0) await tx.servicePackage.update({ where: { id: servicePackage.id }, data: { status: "EXHAUSTED" } });
        await tx.packageRedemption.create({ data: { organizationId, servicePackageId: servicePackage.id, appointmentId: appointment.id, clientId: appointment.clientId, serviceId: appointment.serviceId, createdByUserId: input.actorUserId } });
      }
    }
    const membershipId = appointment.assignedMembershipId ?? appointment.resource.membershipId;
    if (membershipId) {
      const rules = await tx.commissionRule.findMany({ where: { isActive: true, AND: [{ OR: [{ membershipId }, { membershipId: null }] }, { OR: [{ serviceId: appointment.serviceId }, { serviceId: null }] }] } });
      const rule = rules.sort((left, right) => Number(right.membershipId === membershipId) + Number(right.serviceId === appointment.serviceId) - Number(left.membershipId === membershipId) - Number(left.serviceId === appointment.serviceId))[0];
      if (rule) {
        const baseAmountCents = appointment.priceCents ?? appointment.payment?.amountDueCents ?? 0;
        const amountCents = rule.commissionType === "PERCENTAGE" ? Math.round(baseAmountCents * rule.value / 100) : rule.value;
        await tx.commissionEntry.create({ data: { organizationId, appointmentId: appointment.id, membershipId, serviceId: appointment.serviceId, baseAmountCents, amountCents, ruleId: rule.id } });
      }
    }
    await Promise.all([
      tx.appointmentEvent.create({ data: { organizationId, appointmentId: appointment.id, actorUserId: input.actorUserId, type: "COMPLETED", previousValue: { status: appointment.status }, nextValue: { status: "COMPLETED", packageApplied: Boolean(servicePackage) } } }),
      tx.auditLog.create({ data: { organizationId, userId: input.actorUserId, action: "APPOINTMENT_COMPLETED", entityType: "Appointment", entityId: appointment.id } }),
    ]);
    return completed;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}
