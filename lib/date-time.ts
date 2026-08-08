const DEFAULT_TIMEZONE = "America/Sao_Paulo";

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
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const estimatedUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const timezoneName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" })
    .formatToParts(new Date(estimatedUtc))
    .find((part) => part.type === "timeZoneName")?.value;
  const match = timezoneName?.match(/GMT([+-]\d{2}):(\d{2})/);
  const offsetMinutes = match ? Number(match[1]) * 60 + Math.sign(Number(match[1])) * Number(match[2]) : -180;
  return new Date(estimatedUtc - offsetMinutes * 60_000);
}

export function localDayRange(date: string, timezone = DEFAULT_TIMEZONE) {
  const start = dateInTimezone(date, "00:00", timezone);
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end: next };
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
