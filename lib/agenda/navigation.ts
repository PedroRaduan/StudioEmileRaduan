export function isAgendaDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type AgendaView = "day" | "week" | "month" | "list" | "history";

export function agendaDateRange(date: string, view: AgendaView) {
  const base = new Date(`${date}T12:00:00Z`);
  if (view === "day") return { start: date, end: date };
  if (view === "month") return {
    start: new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 12)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10),
  };
  const start = new Date(base);
  if (view === "history") start.setUTCDate(start.getUTCDate() - 29);
  if (view === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (view === "week" ? 6 : 29));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function shiftAgendaDate(date: string, view: AgendaView, direction: number) {
  const value = new Date(`${date}T12:00:00Z`);
  if (view === "month") {
    const day = value.getUTCDate();
    value.setUTCDate(1);
    value.setUTCMonth(value.getUTCMonth() + direction);
    const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(day, lastDay));
  } else value.setUTCDate(value.getUTCDate() + direction * (view === "day" ? 1 : view === "list" || view === "history" ? 30 : 7));
  return value.toISOString().slice(0, 10);
}
