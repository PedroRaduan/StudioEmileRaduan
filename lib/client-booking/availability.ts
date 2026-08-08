import { cookies } from "next/headers";
import { dateInTimezone, dateKeyInTimezone, weekdayInTimezone } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";
import { generateAvailableSlots } from "./slot-rules";

export { generateAvailableSlots, type AvailableSlot } from "./slot-rules";

export const BOOKING_HOLD_COOKIE = "erbf_booking_hold";

export async function getAvailableSlots(serviceId: string, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !process.env.DATABASE_URL) return [];
  const prisma = getPrisma();
  await prisma.bookingHold.updateMany({ where: { status: "ACTIVE", expiresAt: { lte: new Date() } }, data: { status: "EXPIRED" } });

  const [settings, service, resource] = await Promise.all([
    prisma.studioSettings.findUnique({ where: { id: "studio" } }),
    prisma.service.findFirst({ where: { id: serviceId, isActive: true, isOnlineAvailable: true } }),
    prisma.calendarResource.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!settings?.onlineBookingEnabled || !service || !resource) return [];

  const timezone = settings.timezone;
  const dayStart = dateInTimezone(date, "00:00", timezone);
  const nextDate = dateKeyInTimezone(new Date(dayStart.getTime() + 36 * 60 * 60 * 1000), timezone);
  const dayEnd = dateInTimezone(nextDate, "00:00", timezone);
  const weekday = weekdayInTimezone(dayStart, timezone);
  const currentHold = (await cookies()).get(BOOKING_HOLD_COOKIE)?.value;

  const [rule, exception, holiday, appointments, blocks, holds] = await Promise.all([
    prisma.availabilityRule.findUnique({ where: { resourceId_dayOfWeek: { resourceId: resource.id, dayOfWeek: weekday } } }),
    prisma.availabilityException.findUnique({ where: { resourceId_date: { resourceId: resource.id, date: dayStart } } }),
    prisma.holiday.findUnique({ where: { date: dayStart } }),
    prisma.appointment.findMany({ where: { resourceId: resource.id, status: { in: ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE"] }, occupiedFrom: { lt: dayEnd }, occupiedUntil: { gt: dayStart } }, select: { occupiedFrom: true, occupiedUntil: true } }),
    prisma.scheduleBlock.findMany({ where: { resourceId: resource.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } }),
    prisma.bookingHold.findMany({ where: { resourceId: resource.id, status: "ACTIVE", expiresAt: { gt: new Date() }, ...(currentHold ? { tokenHash: { not: sha256(currentHold) } } : {}), occupiedFrom: { lt: dayEnd }, occupiedUntil: { gt: dayStart } }, select: { occupiedFrom: true, occupiedUntil: true } }),
  ]);

  if (holiday?.isClosed || exception?.isClosed) return [];
  const hours = exception?.startsAtMinute !== null && exception?.startsAtMinute !== undefined && exception.endsAtMinute !== null
    ? { start: exception.startsAtMinute, end: exception.endsAtMinute, lunchStart: null, lunchEnd: null }
    : rule?.isEnabled ? { start: rule.startsAtMinute, end: rule.endsAtMinute, lunchStart: rule.lunchStartsAt, lunchEnd: rule.lunchEndsAt } : null;
  if (!hours) return [];

  return generateAvailableSlots({
    date,
    timezone,
    now: new Date(),
    startMinute: hours.start,
    endMinute: hours.end,
    lunchStart: hours.lunchStart,
    lunchEnd: hours.lunchEnd,
    slotMinutes: settings.defaultSlotMinutes,
    durationMinutes: service.durationMinutes,
    preparationMinutes: service.preparationMinutes,
    cleanupMinutes: service.cleanupMinutes,
    minimumNoticeHours: Math.max(settings.minNoticeHours, service.minAdvanceHours),
    maximumAdvanceDays: Math.min(settings.maxAdvanceDays, service.maxAdvanceDays),
    busy: [
      ...appointments.map((item) => ({ startsAt: item.occupiedFrom, endsAt: item.occupiedUntil })),
      ...blocks,
      ...holds.map((item) => ({ startsAt: item.occupiedFrom, endsAt: item.occupiedUntil })),
    ],
  });
}
