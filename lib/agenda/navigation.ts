export function isAgendaDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shiftAgendaDate(date: string, view: "day" | "week" | "month" | "list", direction: number) {
  const value = new Date(`${date}T12:00:00Z`);
  if (view === "month") {
    const day = value.getUTCDate();
    value.setUTCDate(1);
    value.setUTCMonth(value.getUTCMonth() + direction);
    const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(day, lastDay));
  } else value.setUTCDate(value.getUTCDate() + direction * (view === "day" ? 1 : view === "list" ? 30 : 7));
  return value.toISOString().slice(0, 10);
}
