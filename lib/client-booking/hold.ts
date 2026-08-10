import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Prisma } from "@/app/generated/prisma/client";
import { dateInTimezone, dateKeyInTimezone, weekdayInTimezone } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { isInsideWorkingHours, occupiedWindow } from "@/lib/agenda/rules";
import { sha256 } from "@/lib/security/hash";
import { BOOKING_HOLD_COOKIE } from "./availability";
import { isSchedulingConflictError } from "@/lib/agenda/conflict-error";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/agenda/status";
import { activateLegacyTenant } from "@/lib/tenancy/legacy";

export class BookingError extends Error {}

export async function createBookingHold(input: { serviceId: string; date: string; time: string; clientId?: string }) {
  activateLegacyTenant();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const previousToken = (await cookies()).get(BOOKING_HOLD_COOKIE)?.value;
  const prisma = getPrisma();

  try {
    const hold = await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.bookingHold.updateMany({ where: { status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
      if (previousToken) await tx.bookingHold.updateMany({ where: { tokenHash: sha256(previousToken), status: "ACTIVE" }, data: { status: "RELEASED" } });

      const [settings, service, resource] = await Promise.all([
        tx.studioSettings.findUnique({ where: { id: "studio" } }),
        tx.service.findFirst({ where: { id: input.serviceId, isActive: true, isOnlineAvailable: true } }),
        tx.calendarResource.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
      ]);
      if (!settings?.onlineBookingEnabled) throw new BookingError("O agendamento on-line está indisponível no momento.");
      if (!service || !resource) throw new BookingError("Este serviço não está disponível para agendamento on-line.");
      const startsAt = dateInTimezone(input.date, input.time, settings.timezone);
      if (startsAt <= now) throw new BookingError("Escolha um horário futuro.");
      const minimumNoticeHours = Math.max(settings.minNoticeHours, service.minAdvanceHours);
      if (startsAt.getTime() - now.getTime() < minimumNoticeHours * 60 * 60 * 1000) throw new BookingError(`Este serviço exige ${minimumNoticeHours} hora(s) de antecedência.`);
      const maximumAdvanceDays = Math.min(settings.maxAdvanceDays, service.maxAdvanceDays);
      if (startsAt.getTime() - now.getTime() > maximumAdvanceDays * 24 * 60 * 60 * 1000) throw new BookingError("A data está além do período permitido para agendamento.");

      const timezone = settings.timezone;
      const localDate = dateKeyInTimezone(startsAt, timezone);
      const dateOnly = dateInTimezone(localDate, "00:00", timezone);
      const weekday = weekdayInTimezone(startsAt, timezone);
      const startMinute = Number(input.time.slice(0, 2)) * 60 + Number(input.time.slice(3, 5));
      const endMinute = startMinute + service.durationMinutes;
      const timing = occupiedWindow(startsAt, service);
      const [rule, exception, holiday, block, appointment, otherHold] = await Promise.all([
        tx.availabilityRule.findFirst({ where: { resourceId: resource.id, dayOfWeek: weekday } }),
        tx.availabilityException.findFirst({ where: { resourceId: resource.id, date: dateOnly } }),
        tx.holiday.findFirst({ where: { date: dateOnly } }),
        tx.scheduleBlock.findFirst({ where: { resourceId: resource.id, startsAt: { lt: timing.occupiedUntil }, endsAt: { gt: timing.occupiedFrom } } }),
        tx.appointment.findFirst({ where: { resourceId: resource.id, status: { in: ACTIVE_APPOINTMENT_STATUSES }, occupiedFrom: { lt: timing.occupiedUntil }, occupiedUntil: { gt: timing.occupiedFrom } } }),
        tx.bookingHold.findFirst({ where: { resourceId: resource.id, status: "ACTIVE", expiresAt: { gt: now }, occupiedFrom: { lt: timing.occupiedUntil }, occupiedUntil: { gt: timing.occupiedFrom } } }),
      ]);
      if (holiday?.isClosed || exception?.isClosed) throw new BookingError("A agenda está fechada nesta data.");
      const hours = exception?.startsAtMinute !== null && exception?.startsAtMinute !== undefined && exception.endsAtMinute !== null
        ? { startsAtMinute: exception.startsAtMinute, endsAtMinute: exception.endsAtMinute, lunchStartsAt: null, lunchEndsAt: null }
        : rule;
      if (!hours || ("isEnabled" in hours && !hours.isEnabled) || !isInsideWorkingHours(startMinute, endMinute, hours)) throw new BookingError("Este horário está fora do período de atendimento.");
      if (block || appointment || otherHold) throw new BookingError("Este horário acabou de ser reservado. Escolha outra opção.");

      return tx.bookingHold.create({
        data: { tokenHash, clientId: input.clientId, serviceId: service.id, resourceId: resource.id, ...timing, expiresAt: new Date(now.getTime() + settings.bookingHoldMinutes * 60_000) },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });

    (await cookies()).set(BOOKING_HOLD_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: hold.expiresAt });
    return hold;
  } catch (error) {
    if (error instanceof BookingError) throw error;
    if (isSchedulingConflictError(error)) throw new BookingError("Este horário acabou de ser reservado. Escolha outra opção.");
    throw error;
  }
}

export async function getCurrentBookingHold() {
  activateLegacyTenant();
  const token = (await cookies()).get(BOOKING_HOLD_COOKIE)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const hold = await getPrisma().bookingHold.findUnique({ where: { tokenHash: sha256(token) }, include: { service: true, resource: true } });
  if (!hold || hold.status !== "ACTIVE" || hold.expiresAt <= new Date()) {
    if (hold?.status === "ACTIVE") await getPrisma().bookingHold.update({ where: { id: hold.id }, data: { status: "EXPIRED" } }).catch(() => undefined);
    return null;
  }
  return hold;
}

export async function getCompletedBookingHold() {
  activateLegacyTenant();
  const token = (await cookies()).get(BOOKING_HOLD_COOKIE)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  return getPrisma().bookingHold.findFirst({
    where: { tokenHash: sha256(token), status: "CONVERTED", convertedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    select: { id: true, clientId: true },
  });
}

export async function releaseCurrentBookingHold() {
  activateLegacyTenant();
  const cookieStore = await cookies();
  const token = cookieStore.get(BOOKING_HOLD_COOKIE)?.value;
  if (token && process.env.DATABASE_URL) await getPrisma().bookingHold.updateMany({ where: { tokenHash: sha256(token), status: "ACTIVE" }, data: { status: "RELEASED" } });
  cookieStore.delete(BOOKING_HOLD_COOKIE);
}
