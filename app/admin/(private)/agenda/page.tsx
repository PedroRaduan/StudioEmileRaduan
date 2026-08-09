import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import { AgendaDatePicker } from "@/components/admin/agenda-date-picker";
import { getAgendaForRange } from "@/lib/admin/agenda";
import { dateKeyInTimezone, formatDate, formatTime, todayInTimezone } from "@/lib/date-time";

type View = "day" | "week" | "month" | "list";
const views: Array<{ value: View; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "list", label: "Lista" },
];

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string; saved?: string }> }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : todayInTimezone();
  const view = views.some((item) => item.value === params.view) ? params.view as View : "day";
  const range = dateRange(date, view);
  const agenda = await getAgendaForRange(range.start, range.end);
  const groups = groupAgenda(agenda.appointments, agenda.blocks);
  const previous = shiftDate(date, view, -1);
  const next = shiftDate(date, view, 1);

  return (
    <main className="admin-page agenda-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">Agenda</p><h1>{periodTitle(date, view)}</h1><p>Atendimentos, bloqueios e alterações em uma única visão.</p></div>
        <Link className="button button-primary" href={`/admin/agendamentos/novo?date=${date}`}><CalendarPlus aria-hidden="true" size={18} /> Novo agendamento</Link>
      </div>
      {params.saved ? <p className="form-success agenda-success" role="status">Agendamento salvo. O horário já está protegido contra conflitos.</p> : null}
      <nav className="agenda-view-tabs" aria-label="Visualização da agenda">
        {views.map((item) => <Link className={view === item.value ? "active" : ""} href={`/admin/agenda?date=${date}&view=${item.value}`} key={item.value}>{item.label}</Link>)}
      </nav>
      <div className="agenda-toolbar">
        <Link aria-label="Período anterior" href={`/admin/agenda?date=${previous}&view=${view}`}><ChevronLeft aria-hidden="true" size={19} /></Link>
        <AgendaDatePicker date={date} view={view} />
        <Link aria-label="Próximo período" href={`/admin/agenda?date=${next}&view=${view}`}><ChevronRight aria-hidden="true" size={19} /></Link>
        <Link className="today-link" href={`/admin/agenda?date=${todayInTimezone()}&view=${view}`}>Hoje</Link>
      </div>
      {groups.length ? (
        <div className="agenda-groups">
          {groups.map((group) => {
            const count = group.items.filter((item) => item.kind === "appointment").length;
            return (
              <section className="admin-card agenda-card" key={group.date}>
                <header className="agenda-group-heading">
                  <h2>{formatDate(new Date(`${group.date}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</h2>
                  <span>{count} {count === 1 ? "atendimento" : "atendimentos"}</span>
                </header>
                <ol className="agenda-list">
                  {group.items.map((item) => item.kind === "block" ? (
                    <li className="agenda-block" key={item.id}>
                      <LockKeyhole aria-hidden="true" size={16} />
                      <time>{formatTime(item.startsAt)} – {formatTime(item.endsAt)}</time>
                      <strong>{item.title}</strong>
                      {item.note ? <span>{item.note}</span> : null}
                    </li>
                  ) : (
                    <li className={`agenda-item status-${item.status.toLowerCase()}`} key={item.id}>
                      <Link href={`/admin/agendamentos/${item.id}`}>
                        <time>{formatTime(item.startsAt)}</time>
                        <div className="agenda-client"><strong>{item.client.preferredName ?? item.client.fullName}</strong><span>{item.service.name} · {item.durationMinutes} min</span></div>
                        <span className="agenda-status">{statusLabel(item.status)}</span>
                        <i aria-hidden="true" style={{ backgroundColor: item.service.calendarColor }} />
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="admin-card agenda-card">
          <div className="empty-state agenda-empty"><p>Nenhum horário neste período.</p><span>Crie um atendimento após confirmar a disponibilidade com a cliente.</span><Link href={`/admin/agendamentos/novo?date=${date}`}>Marcar atendimento</Link></div>
        </section>
      )}
    </main>
  );
}

function dateRange(date: string, view: View) {
  const base = new Date(`${date}T12:00:00Z`);
  if (view === "day") return { start: date, end: date };
  if (view === "month") {
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 12));
    const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12));
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  const start = new Date(base);
  const weekday = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - ((weekday + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (view === "list" ? 29 : 6));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function shiftDate(date: string, view: View, direction: number) {
  const value = new Date(`${date}T12:00:00Z`);
  if (view === "month") value.setUTCMonth(value.getUTCMonth() + direction);
  else value.setUTCDate(value.getUTCDate() + direction * (view === "day" ? 1 : view === "list" ? 30 : 7));
  return value.toISOString().slice(0, 10);
}

function periodTitle(date: string, view: View) {
  const value = new Date(`${date}T12:00:00Z`);
  if (view === "month") return formatDate(value, { month: "long", year: "numeric", timeZone: "UTC" });
  if (view === "day") return formatDate(value, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const range = dateRange(date, view);
  return `${formatDate(new Date(`${range.start}T12:00:00Z`), { day: "2-digit", month: "short", timeZone: "UTC" })} a ${formatDate(new Date(`${range.end}T12:00:00Z`), { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}`;
}

function statusLabel(status: string) {
  return ({ SCHEDULED: "Agendado", CONFIRMED: "Confirmado", ARRIVED: "Chegou", IN_SERVICE: "Em atendimento", COMPLETED: "Concluído", CANCELED: "Cancelado", NO_SHOW: "Falta" } as Record<string, string>)[status] ?? status;
}

function groupAgenda(appointments: Awaited<ReturnType<typeof getAgendaForRange>>["appointments"], blocks: Awaited<ReturnType<typeof getAgendaForRange>>["blocks"]) {
  const map = new Map<string, Array<({ kind: "appointment" } & (typeof appointments)[number]) | ({ kind: "block" } & (typeof blocks)[number])>>();
  appointments.forEach((item) => {
    const key = dateKeyInTimezone(item.startsAt);
    map.set(key, [...(map.get(key) ?? []), { ...item, kind: "appointment" }]);
  });
  blocks.forEach((item) => {
    const key = dateKeyInTimezone(item.startsAt);
    map.set(key, [...(map.get(key) ?? []), { ...item, kind: "block" }]);
  });
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupDate, items]) => ({ date: groupDate, items: items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()) }));
}
