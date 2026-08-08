import { dateInTimezone } from "../date-time";
import { occupiedWindow, overlaps } from "../agenda/rules";

export type AvailableSlot = { time: string; startsAt: Date; endsAt: Date };
type BusyWindow = { startsAt: Date; endsAt: Date };

export function generateAvailableSlots(input: {
  date: string;
  timezone: string;
  now: Date;
  startMinute: number;
  endMinute: number;
  lunchStart: number | null;
  lunchEnd: number | null;
  slotMinutes: number;
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
  minimumNoticeHours: number;
  maximumAdvanceDays: number;
  busy: BusyWindow[];
}) {
  const slots: AvailableSlot[] = [];
  const latestAllowed = new Date(input.now.getTime() + input.maximumAdvanceDays * 24 * 60 * 60 * 1000);
  const earliestAllowed = new Date(input.now.getTime() + input.minimumNoticeHours * 60 * 60 * 1000);

  for (let minute = input.startMinute; minute + input.durationMinutes <= input.endMinute; minute += input.slotMinutes) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const startsAt = dateInTimezone(input.date, time, input.timezone);
    const timing = occupiedWindow(startsAt, input);
    if (startsAt < earliestAllowed || startsAt > latestAllowed) continue;
    const serviceEndMinute = minute + input.durationMinutes;
    if (input.lunchStart !== null && input.lunchEnd !== null && minute < input.lunchEnd && serviceEndMinute > input.lunchStart) continue;
    if (input.busy.some((window) => overlaps(timing.occupiedFrom, timing.occupiedUntil, window.startsAt, window.endsAt))) continue;
    slots.push({ time, startsAt, endsAt: timing.endsAt });
  }
  return slots;
}
