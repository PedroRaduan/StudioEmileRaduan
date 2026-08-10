import { dateKeyInTimezone, weekdayInTimezone } from "../date-time";

export function matchesWaitlistPreference(input: {
  preferredDays: number[];
  preferredPeriod: "ANY" | "MORNING" | "AFTERNOON" | "EVENING";
  earliestDate: Date | null;
  latestDate: Date | null;
}, startsAt: Date, timezone: string) {
  const day = weekdayInTimezone(startsAt, timezone);
  if (input.preferredDays.length && !input.preferredDays.includes(day)) return false;
  const date = dateKeyInTimezone(startsAt, timezone);
  if (input.earliestDate && date < dateKeyInTimezone(input.earliestDate, timezone)) return false;
  if (input.latestDate && date > dateKeyInTimezone(input.latestDate, timezone)) return false;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(startsAt));
  if (input.preferredPeriod === "MORNING") return hour < 12;
  if (input.preferredPeriod === "AFTERNOON") return hour >= 12 && hour < 18;
  if (input.preferredPeriod === "EVENING") return hour >= 18;
  return true;
}
