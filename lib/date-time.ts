import { DEFAULT_STUDIO_TIMEZONE } from "./studio-config";

export const DEFAULT_TIMEZONE = DEFAULT_STUDIO_TIMEZONE;

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
};

export function dateKeyInTimezone(value: Date, timezone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dateInTimezone(date: string, time: string, timezone = DEFAULT_TIMEZONE) {
  const desired = parseLocalDateTime(date, time);
  const localAsUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hours, desired.minutes);

  // O deslocamento pode mudar entre o instante estimado e o instante real em
  // regiões com horário de verão. Duas passagens tornam a conversão estável.
  let instant = new Date(localAsUtc - timezoneOffsetMs(new Date(localAsUtc), timezone));
  instant = new Date(localAsUtc - timezoneOffsetMs(instant, timezone));

  const converted = localParts(instant, timezone);
  if (!sameLocalDateTime(converted, desired)) {
    throw new RangeError("A data ou o horário não existe no fuso informado.");
  }

  return instant;
}

export function localDayRange(date: string, timezone = DEFAULT_TIMEZONE) {
  const start = dateInTimezone(date, "00:00", timezone);
  const [year, month, day] = date.split("-").map(Number);
  const nextCalendarDate = new Date(Date.UTC(year, month - 1, day + 1, 12)).toISOString().slice(0, 10);
  return { start, end: dateInTimezone(nextCalendarDate, "00:00", timezone) };
}

export function weekdayInTimezone(value: Date, timezone = DEFAULT_TIMEZONE) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(value);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

export function formatDate(value: Date, options: Intl.DateTimeFormatOptions = {}) {
  const formatterOptions: Intl.DateTimeFormatOptions = Object.keys(options).length
    ? { timeZone: DEFAULT_TIMEZONE, ...options }
    : { dateStyle: "medium", timeZone: DEFAULT_TIMEZONE };

  return new Intl.DateTimeFormat("pt-BR", formatterOptions).format(value);
}

export function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: DEFAULT_TIMEZONE }).format(value);
}

export function todayInTimezone(timezone = DEFAULT_TIMEZONE) {
  return dateKeyInTimezone(new Date(), timezone);
}

export function greetingInTimezone(timezone = DEFAULT_TIMEZONE, value = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" })
    .formatToParts(value)
    .find((part) => part.type === "hour")?.value);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function parseLocalDateTime(date: string, time: string): LocalDateTimeParts {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError("Data ou horário inválido.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day, 12));
  if (calendarCheck.getUTCFullYear() !== year || calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) {
    throw new RangeError("Data inválida.");
  }

  return { year, month, day, hours, minutes };
}

function localParts(value: Date, timezone: string): LocalDateTimeParts & { seconds: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day"), hours: part("hour"), minutes: part("minute"), seconds: part("second") };
}

function timezoneOffsetMs(value: Date, timezone: string) {
  const parts = localParts(value, timezone);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, parts.seconds);
  return representedAsUtc - value.getTime();
}

function sameLocalDateTime(actual: LocalDateTimeParts, expected: LocalDateTimeParts) {
  return actual.year === expected.year
    && actual.month === expected.month
    && actual.day === expected.day
    && actual.hours === expected.hours
    && actual.minutes === expected.minutes;
}
