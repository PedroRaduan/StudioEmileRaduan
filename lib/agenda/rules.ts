export type ServiceTiming = {
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
};

export function occupiedWindow(startsAt: Date, timing: ServiceTiming) {
  const endsAt = new Date(startsAt.getTime() + timing.durationMinutes * 60_000);
  return {
    startsAt,
    endsAt,
    occupiedFrom: new Date(startsAt.getTime() - timing.preparationMinutes * 60_000),
    occupiedUntil: new Date(endsAt.getTime() + timing.cleanupMinutes * 60_000),
  };
}

export function overlaps(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function isInsideWorkingHours(
  startMinute: number,
  endMinute: number,
  rule: { startsAtMinute: number; endsAtMinute: number; lunchStartsAt: number | null; lunchEndsAt: number | null },
) {
  if (startMinute < rule.startsAtMinute || endMinute > rule.endsAtMinute) return false;
  if (rule.lunchStartsAt === null || rule.lunchEndsAt === null) return true;
  return !overlaps(
    new Date(startMinute * 60_000),
    new Date(endMinute * 60_000),
    new Date(rule.lunchStartsAt * 60_000),
    new Date(rule.lunchEndsAt * 60_000),
  );
}
