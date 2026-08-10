import { randomBytes } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { dateInTimezone, dateKeyInTimezone, weekdayInTimezone } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { isInsideWorkingHours, occupiedWindow } from "@/lib/agenda/rules";
import { CURRENT_STUDIO_ID, DEFAULT_STUDIO_TIMEZONE } from "@/lib/studio-config";
import { isSchedulingConflictError } from "@/lib/agenda/conflict-error";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/agenda/status";

export class SchedulingError extends Error {}

export type CreateAppointmentInput = {
  clientId: string;
  serviceId: string;
  resourceId: string;
  date: string;
  time: string;
  notes?: string;
  requestKey?: string;
  ownerId: string;
};

export async function createAppointment(input: CreateAppointmentInput) {
  const prisma = getPrisma();

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.requestKey) {
        const duplicate = await tx.appointment.findUnique({ where: { requestKey: input.requestKey } });
        if (duplicate) return { appointment: duplicate, availabilityWarning: null };
      }

      const [client, service, resource, settings] = await Promise.all([
        tx.client.findFirst({ where: { id: input.clientId, deletedAt: null } }),
        tx.service.findFirst({ where: { id: input.serviceId, isActive: true } }),
        tx.calendarResource.findFirst({ where: { id: input.resourceId, isActive: true } }),
        tx.studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID } }),
      ]);
      if (!client) throw new SchedulingError("A cliente selecionada não está disponível.");
      if (client.status === "BLOCKED") throw new SchedulingError("Esta cliente está bloqueada para novos agendamentos.");
      if (!service || !resource) throw new SchedulingError("Serviço ou agenda indisponível.");

      const timezone = settings?.timezone ?? DEFAULT_STUDIO_TIMEZONE;
      const startsAt = dateInTimezone(input.date, input.time, timezone);
      if (startsAt <= new Date()) throw new SchedulingError("Escolha um horário futuro.");
      const minimumNoticeHours = Math.max(settings?.minNoticeHours ?? 0, service.minAdvanceHours);
      if (startsAt.getTime() - Date.now() < minimumNoticeHours * 60 * 60 * 1000) throw new SchedulingError(`Este serviço exige pelo menos ${minimumNoticeHours} hora(s) de antecedência.`);
      const maximumAdvanceDays = Math.min(settings?.maxAdvanceDays ?? 90, service.maxAdvanceDays);
      if (startsAt.getTime() - Date.now() > maximumAdvanceDays * 24 * 60 * 60 * 1000) throw new SchedulingError(`Este serviço pode ser marcado com no máximo ${maximumAdvanceDays} dia(s) de antecedência.`);

      const localDate = dateKeyInTimezone(startsAt, timezone);
      const timing = occupiedWindow(startsAt, service);
      const startMinute = Number(input.time.slice(0, 2)) * 60 + Number(input.time.slice(3, 5));
      const endMinute = startMinute + service.durationMinutes;
      const weekday = weekdayInTimezone(startsAt, timezone);
      const dateOnly = dateInTimezone(localDate, "00:00", timezone);

      await tx.bookingHold.updateMany({ where: { status: "ACTIVE", expiresAt: { lte: new Date() } }, data: { status: "EXPIRED" } });
      const [rule, exception, holiday, block, conflict, holdConflict] = await Promise.all([
        tx.availabilityRule.findUnique({ where: { resourceId_dayOfWeek: { resourceId: resource.id, dayOfWeek: weekday } } }),
        tx.availabilityException.findUnique({ where: { resourceId_date: { resourceId: resource.id, date: dateOnly } } }),
        tx.holiday.findUnique({ where: { date: dateOnly } }),
        tx.scheduleBlock.findFirst({ where: { resourceId: resource.id, startsAt: { lt: timing.occupiedUntil }, endsAt: { gt: timing.occupiedFrom } } }),
        tx.appointment.findFirst({
          where: {
            resourceId: resource.id,
            status: { in: ACTIVE_APPOINTMENT_STATUSES },
            occupiedFrom: { lt: timing.occupiedUntil },
            occupiedUntil: { gt: timing.occupiedFrom },
          },
        }),
        tx.bookingHold.findFirst({ where: { resourceId: resource.id, status: "ACTIVE", expiresAt: { gt: new Date() }, occupiedFrom: { lt: timing.occupiedUntil }, occupiedUntil: { gt: timing.occupiedFrom } } }),
      ]);

      if (holiday?.isClosed || exception?.isClosed) throw new SchedulingError("A agenda está fechada nesta data.");
      const hours = exception?.startsAtMinute !== null && exception?.startsAtMinute !== undefined && exception.endsAtMinute !== null
        ? { startsAtMinute: exception.startsAtMinute, endsAtMinute: exception.endsAtMinute, lunchStartsAt: null, lunchEndsAt: null }
        : rule;
      const hasConfiguredWorkingHours = Boolean(hours && (!("isEnabled" in hours) || hours.isEnabled));
      if (hasConfiguredWorkingHours && hours && !isInsideWorkingHours(startMinute, endMinute, hours)) {
        throw new SchedulingError("O horário está fora da disponibilidade configurada.");
      }
      if (block || conflict || holdConflict) throw new SchedulingError("Este horário acabou de ser ocupado. Escolha outro horário.");

      const priceCents = service.promotionalPriceCents ?? service.priceCents;
      const paymentStatus = priceCents === null ? "NOT_REQUIRED" : "PENDING";
      const depositAmountCents = service.depositRequired && service.depositValue && priceCents !== null
        ? service.depositType === "PERCENT" ? Math.round(priceCents * service.depositValue / 100) : service.depositValue
        : null;
      const appointment = await tx.appointment.create({
        data: {
          code: appointmentCode(),
          requestKey: input.requestKey,
          clientId: client.id,
          serviceId: service.id,
          resourceId: resource.id,
          createdByUserId: input.ownerId,
          ...timing,
          durationMinutes: service.durationMinutes,
          priceCents,
          paymentStatus,
          internalNotes: input.notes?.trim() || null,
          events: { create: { actorUserId: input.ownerId, type: "CREATED", nextValue: { startsAt: startsAt.toISOString(), serviceId: service.id } } },
          payment: { create: { clientId: client.id, amountDueCents: priceCents, status: paymentStatus, depositRequired: service.depositRequired, depositAmountCents } },
        },
      });

      await tx.client.update({ where: { id: client.id }, data: { firstAppointmentAt: client.firstAppointmentAt ?? startsAt } });
      await tx.auditLog.create({ data: { userId: input.ownerId, action: "APPOINTMENT_CREATED", entityType: "Appointment", entityId: appointment.id } });
      return {
        appointment,
        availabilityWarning: hasConfiguredWorkingHours ? null : "Os horários de trabalho deste dia ainda não estão configurados. O atendimento foi salvo mesmo assim; revise a agenda quando puder.",
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
  } catch (error) {
    if (error instanceof SchedulingError) throw error;
    if (isSchedulingConflictError(error)) throw new SchedulingError("Este horário acabou de ser ocupado. Escolha outro horário.");
    throw error;
  }
}

function appointmentCode() {
  return `ERBF-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}
