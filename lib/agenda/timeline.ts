import { DEFAULT_TIMEZONE } from "../date-time";

export const CALENDAR_SLOT_INTERVALS = [5, 10, 15, 30] as const;
export type CalendarSlotInterval = (typeof CALENDAR_SLOT_INTERVALS)[number];

export type TimelineSpan = { startsAtMinute: number; endsAtMinute: number };

export function calendarSlotInterval(value: number | null | undefined): CalendarSlotInterval {
  return CALENDAR_SLOT_INTERVALS.includes(value as CalendarSlotInterval) ? value as CalendarSlotInterval : 10;
}

export function minuteOfDayInTimezone(value: Date, timezone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return part("hour") * 60 + part("minute");
}

export function timelinePixelsPerMinute(interval: CalendarSlotInterval) {
  return Math.max(2.2, 28 / interval);
}

export function timelineSlots(startsAtMinute: number, endsAtMinute: number, interval: CalendarSlotInterval) {
  const slots: number[] = [];
  for (let minute = startsAtMinute; minute < endsAtMinute; minute += interval) slots.push(minute);
  return slots;
}

/** Retorna o início visual da agenda sem manter horas vazias antes do próximo item. */
export function nextTimelineStart(defaultStart: number, spans: TimelineSpan[]) {
  const validSpans = spans.filter((span) => span.endsAtMinute > span.startsAtMinute);
  return validSpans.length ? Math.min(...validSpans.map((span) => span.startsAtMinute)) : defaultStart;
}

export function timelineBounds(defaultStart: number, defaultEnd: number, spans: TimelineSpan[], interval: CalendarSlotInterval) {
  const validSpans = spans.filter((span) => span.endsAtMinute > span.startsAtMinute);
  const earliest = validSpans.length ? Math.min(...validSpans.map((span) => span.startsAtMinute)) : defaultStart;
  const latest = validSpans.length ? Math.max(...validSpans.map((span) => span.endsAtMinute)) : defaultEnd;
  const startsAtMinute = Math.max(0, Math.floor(Math.min(defaultStart, earliest) / interval) * interval);
  const endsAtMinute = Math.min(24 * 60, Math.ceil(Math.max(defaultEnd, latest) / interval) * interval);
  return { startsAtMinute, endsAtMinute };
}

export function timelinePlacement(startsAtMinute: number, endsAtMinute: number, gridStartMinute: number, pixelsPerMinute: number) {
  return {
    top: Math.max(0, startsAtMinute - gridStartMinute) * pixelsPerMinute,
    height: Math.max(0, endsAtMinute - startsAtMinute) * pixelsPerMinute,
  };
}

export function timeFromMinute(minute: number) {
  const normalized = Math.min(24 * 60 - 1, Math.max(0, minute));
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}
