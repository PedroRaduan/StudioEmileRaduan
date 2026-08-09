import { Prisma } from "@/app/generated/prisma/client";
import { dateInTimezone, dateKeyInTimezone, weekdayInTimezone } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { isInsideWorkingHours, occupiedWindow } from "@/lib/agenda/rules";
import { SchedulingError } from "@/lib/agenda/create-appointment";
import { CURRENT_STUDIO_ID, DEFAULT_STUDIO_TIMEZONE } from "@/lib/studio-config";
import { isSchedulingConflictError } from "@/lib/agenda/conflict-error";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/agenda/status";

export async function rescheduleAppointment(input: { appointmentId: string; date: string; time: string; reason: string; actorUserId: string }) {
  const prisma = getPrisma();

  try {
    return await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { service: true } });
      if (!appointment) throw new SchedulingError("Agendamento não encontrado.");
      if (["COMPLETED", "CANCELED"].includes(appointment.status)) throw new SchedulingError("Este atendimento não pode mais ser reagendado.");

      const settings = await tx.studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID } });
      const timezone = settings?.timezone ?? DEFAULT_STUDIO_TIMEZONE;
      const startsAt = dateInTimezone(input.date, input.time, timezone);
      if (startsAt <= new Date()) throw new SchedulingError("Escolha um horário futuro.");
      const minimumNoticeHours = Math.max(settings?.minNoticeHours ?? 0, appointment.service.minAdvanceHours);
      if (startsAt.getTime() - Date.now() < minimumNoticeHours * 60 * 60 * 1000) throw new SchedulingError(`Este serviço exige pelo menos ${minimumNoticeHours} hora(s) de antecedência.`);
      const maximumAdvanceDays = Math.min(settings?.maxAdvanceDays ?? 90, appointment.service.maxAdvanceDays);
      if (startsAt.getTime() - Date.now() > maximumAdvanceDays * 24 * 60 * 60 * 1000) throw new SchedulingError(`Este serviço pode ser marcado com no máximo ${maximumAdvanceDays} dia(s) de antecedência.`);
      const timing = occupiedWindow(startsAt, appointment.service);
      const startMinute = Number(input.time.slice(0, 2)) * 60 + Number(input.time.slice(3, 5));
      const endMinute = startMinute + appointment.service.durationMinutes;
      const weekday = weekdayInTimezone(startsAt, timezone);
      const localDate = dateKeyInTimezone(startsAt, timezone);
      const dateOnly = dateInTimezone(localDate, "00:00", timezone);
      await tx.bookingHold.updateMany({ where: { status: "ACTIVE", expiresAt: { lte: new Date() } }, data: { status: "EXPIRED" } });
      const [rule, exception, holiday, block, conflict, holdConflict] = await Promise.all([
        tx.availabilityRule.findUnique({ where: { resourceId_dayOfWeek: { resourceId: appointment.resourceId, dayOfWeek: weekday } } }),
        tx.availabilityException.findUnique({ where: { resourceId_date: { resourceId: appointment.resourceId, date: dateOnly } } }),
        tx.holiday.findUnique({ where: { date: dateOnly } }),
        tx.scheduleBlock.findFirst({ where: { resourceId: appointment.resourceId, startsAt: { lt: timing.occupiedUntil }, endsAt: { gt: timing.occupiedFrom } } }),
        tx.appointment.findFirst({ where: { id: { not: appointment.id }, resourceId: appointment.resourceId, status: { in: ACTIVE_APPOINTMENT_STATUSES }, occupiedFrom: { lt: timing.occupiedUntil }, occupiedUntil: { gt: timing.occupiedFrom } } }),
        tx.bookingHold.findFirst({ where: { resourceId: appointment.resourceId, status: "ACTIVE", expiresAt: { gt: new Date() }, occupiedFrom: { lt: timing.occupiedUntil }, occupiedUntil: { gt: timing.occupiedFrom } } }),
      ]);

      if (holiday?.isClosed || exception?.isClosed) throw new SchedulingError("A agenda está fechada nesta data.");
      const hours = exception?.startsAtMinute !== null && exception?.startsAtMinute !== undefined && exception.endsAtMinute !== null
        ? { startsAtMinute: exception.startsAtMinute, endsAtMinute: exception.endsAtMinute, lunchStartsAt: null, lunchEndsAt: null }
        : rule;
      if (!hours || ("isEnabled" in hours && !hours.isEnabled) || !isInsideWorkingHours(startMinute, endMinute, hours)) throw new SchedulingError("O novo horário está fora da disponibilidade configurada.");
      if (block || conflict || holdConflict) throw new SchedulingError("O novo horário está ocupado. Escolha outra opção.");

      const previous = { startsAt: appointment.startsAt.toISOString(), endsAt: appointment.endsAt.toISOString(), status: appointment.status };
      const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { ...timing, durationMinutes: appointment.service.durationMinutes, status: "SCHEDULED", confirmedAt: null, cancellationReason: null, cancelledAt: null } });
      await tx.appointmentEvent.create({ data: { appointmentId: appointment.id, actorUserId: input.actorUserId, type: "RESCHEDULED", reason: input.reason, previousValue: previous, nextValue: { startsAt: updated.startsAt.toISOString(), endsAt: updated.endsAt.toISOString(), status: updated.status } } });
      await tx.auditLog.create({ data: { userId: input.actorUserId, action: "APPOINTMENT_RESCHEDULED", entityType: "Appointment", entityId: appointment.id, before: previous, after: { startsAt: updated.startsAt.toISOString(), status: updated.status } } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
  } catch (error) {
    if (error instanceof SchedulingError) throw error;
    if (isSchedulingConflictError(error)) throw new SchedulingError("O novo horário acabou de ser ocupado. Escolha outra opção.");
    throw error;
  }
}

export async function cancelAppointment(input: { appointmentId: string; reason: string; actorUserId: string }) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { payment: true } });
    if (!appointment) throw new SchedulingError("Agendamento não encontrado.");
    if (appointment.status === "COMPLETED") throw new SchedulingError("Um atendimento concluído não pode ser cancelado.");
    if (appointment.status === "CANCELED") return appointment;
    const paymentStatus = appointment.payment && appointment.payment.amountPaidCents === 0 ? "CANCELED" as const : appointment.paymentStatus;
    const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELED", cancelledAt: new Date(), cancellationReason: input.reason, paymentStatus } });
    if (appointment.payment && appointment.payment.amountPaidCents === 0) {
      await tx.payment.update({ where: { id: appointment.payment.id }, data: { status: "CANCELED", events: { create: { type: "CANCELED_WITH_APPOINTMENT", previousValue: { status: appointment.payment.status }, nextValue: { status: "CANCELED" } } } } });
    }
    await tx.appointmentEvent.create({ data: { appointmentId: appointment.id, actorUserId: input.actorUserId, type: "CANCELED", reason: input.reason, previousValue: { status: appointment.status, startsAt: appointment.startsAt.toISOString(), paymentStatus: appointment.paymentStatus }, nextValue: { status: "CANCELED", paymentStatus } } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: "APPOINTMENT_CANCELED", entityType: "Appointment", entityId: appointment.id, before: { status: appointment.status }, after: { status: "CANCELED", reason: input.reason } } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
