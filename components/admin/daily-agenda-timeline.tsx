import Link from "next/link";
import { CalendarPlus, CheckCheck, Circle, CircleCheckBig, Clock3, LockKeyhole, UserRoundX, X } from "lucide-react";
import type { getAgendaForDay } from "@/lib/admin/agenda";
import { dateKeyInTimezone, formatDate, formatTime, todayInTimezone } from "@/lib/date-time";
import {
  calendarSlotInterval,
  minuteOfDayInTimezone,
  timeFromMinute,
  timelineBounds,
  nextTimelineStart,
  timelinePixelsPerMinute,
  timelinePlacement,
  timelineSlots,
} from "@/lib/agenda/timeline";
import { CurrentTimeLine } from "./current-time-line";

type DailyAgendaData = Awaited<ReturnType<typeof getAgendaForDay>>;
type Resource = NonNullable<DailyAgendaData["resource"]>;
type ResourceView = {
  resource: Resource;
  workingWindow: ReturnType<typeof getWorkingWindow>;
  appointments: DailyAgendaData["appointments"];
  blocks: DailyAgendaData["blocks"];
  appointmentSpans: { startsAtMinute: number; endsAtMinute: number }[];
  blockSpans: { startsAtMinute: number; endsAtMinute: number }[];
};

export function DailyAgendaTimeline({ data, date }: { data: DailyAgendaData; date: string }) {
  const interval = calendarSlotInterval(data.settings?.calendarSlotInterval);
  const timezone = data.settings?.timezone;
  const resources: Resource[] = data.resources.length ? data.resources : data.resource ? [data.resource] : [];
  const views = resources.map((resource) => {
    const workingWindow = getWorkingWindow(data, resource, date);
    const appointments = data.appointments.filter((appointment) => appointment.resourceId === resource.id);
    const blocks = data.blocks.filter((block) => block.resourceId === resource.id);
    return {
      resource,
      workingWindow,
      appointments,
      blocks,
      appointmentSpans: appointments.filter((appointment) => appointment.status !== "CANCELED").map((appointment) => spanForDate(appointment.startsAt, appointment.endsAt, date, timezone)),
      blockSpans: blocks.map((block) => spanForDate(block.startsAt, block.endsAt, date, timezone)),
    };
  });
  const starts = views.map((view) => view.workingWindow.start);
  const ends = views.map((view) => view.workingWindow.end);
  const spans = views.flatMap((view) => [...view.appointmentSpans, ...view.blockSpans]);
  const currentMinute = date === todayInTimezone(timezone) ? minuteOfDayInTimezone(new Date(), timezone) : null;
  const relevantSpans = currentMinute === null ? spans : spans.filter((span) => span.endsAtMinute > currentMinute);
  const nextCommitmentStart = relevantSpans.length ? Math.min(...relevantSpans.map((span) => span.startsAtMinute)) : null;
  const defaultStart = starts.length ? Math.min(...starts) : 8 * 60;
  const focusedStart = nextCommitmentStart === null ? defaultStart : nextTimelineStart(defaultStart, relevantSpans);
  const bounds = timelineBounds(focusedStart, ends.length ? Math.max(...ends) : 20 * 60, relevantSpans, interval);
  const pixelsPerMinute = timelinePixelsPerMinute(interval);
  const height = (bounds.endsAtMinute - bounds.startsAtMinute) * pixelsPerMinute;
  const slots = timelineSlots(bounds.startsAtMinute, bounds.endsAtMinute, interval);
  const liveCount = data.appointments.filter((appointment) => appointment.status !== "CANCELED").length;

  return (
    <section aria-label={`Agenda de ${formatDate(new Date(`${date}T12:00:00Z`), { day: "numeric", month: "long", timeZone: "UTC" })}`} className="day-agenda">
      <header className="day-agenda-summary"><div><Clock3 aria-hidden="true" size={18} /><span><strong>{liveCount}</strong> {liveCount === 1 ? "atendimento" : "atendimentos"}</span></div><span>Grade de {interval} minutos</span></header>
      {!views.length ? <div className="timeline-notice" role="note"><span>A agenda ainda não tem profissionais ou recursos ativos.</span><Link href="/admin/configuracoes/horarios">Configurar agenda</Link></div> : null}
      <div className={`timeline-resources timeline-resources-${Math.min(views.length, 4)}`}>
        {views.map((view) => <ResourceTimeline bounds={bounds} date={date} height={height} interval={interval} key={view.resource.id} pixelsPerMinute={pixelsPerMinute} slots={slots} timezone={timezone} view={view} />)}
      </div>
      {!liveCount && views.length ? <div className="timeline-empty-hint"><CalendarPlus aria-hidden="true" size={17} /><span>Dia livre. Toque em qualquer horário para agendar.</span></div> : null}
    </section>
  );
}

function ResourceTimeline({ bounds, date, height, interval, pixelsPerMinute, slots, timezone, view }: {
  bounds: { startsAtMinute: number; endsAtMinute: number };
  date: string;
  height: number;
  interval: number;
  pixelsPerMinute: number;
  slots: number[];
  timezone?: string;
  view: ResourceView;
}) {
  const liveAppointments = view.appointments.filter((appointment) => appointment.status !== "CANCELED" && spanForDate(appointment.startsAt, appointment.endsAt, date, timezone).endsAtMinute > bounds.startsAtMinute);
  const canceledAppointments = view.appointments.filter((appointment) => appointment.status === "CANCELED");
  const visibleBlocks = view.blocks.filter((block) => spanForDate(block.startsAt, block.endsAt, date, timezone).endsAtMinute > bounds.startsAtMinute);
  return <article className="timeline-resource">
    <header><strong>{view.resource.name}</strong><span>{liveAppointments.length} {liveAppointments.length === 1 ? "atendimento" : "atendimentos"}</span></header>
    {view.workingWindow.notice ? <div className="timeline-notice" role="note"><span>{view.workingWindow.notice}</span></div> : null}
    <div className="timeline-scroll-region"><div className="timeline-canvas" style={{ height }}>
      {slots.map((minute) => {
        const placement = timelinePlacement(minute, minute + interval, bounds.startsAtMinute, pixelsPerMinute);
        const time = timeFromMinute(minute);
        const occupied = [...view.appointmentSpans, ...view.blockSpans].some((span) => span.startsAtMinute < minute + interval && span.endsAtMinute > minute);
        return occupied ? <div aria-hidden="true" className="timeline-slot is-occupied" key={minute} style={{ height: placement.height, top: placement.top }}><time>{time}</time><span /></div> : <Link aria-label={`Criar agendamento na agenda ${view.resource.name} às ${time}`} className="timeline-slot" href={`/admin/agendamentos/novo?date=${date}&time=${time}&resourceId=${view.resource.id}`} key={minute} style={{ height: placement.height, top: placement.top }}><time dateTime={time}>{time}</time><span aria-hidden="true" /></Link>;
      })}
      {visibleBlocks.map((block) => {
        const span = spanForDate(block.startsAt, block.endsAt, date, timezone);
        const placement = timelinePlacement(span.startsAtMinute, span.endsAtMinute, bounds.startsAtMinute, pixelsPerMinute);
        return <div className="timeline-block" key={block.id} style={{ height: placement.height, top: placement.top }}><LockKeyhole aria-hidden="true" size={14} /><strong>{block.title}</strong><span>{formatTime(block.startsAt)}–{formatTime(block.endsAt)}</span></div>;
      })}
      {liveAppointments.map((appointment) => {
        const span = spanForDate(appointment.startsAt, appointment.endsAt, date, timezone);
        const placement = timelinePlacement(span.startsAtMinute, span.endsAtMinute, bounds.startsAtMinute, pixelsPerMinute);
        const compact = appointment.durationMinutes <= 30;
        return <Link aria-label={`${appointment.client.preferredName ?? appointment.client.fullName}, ${formatTime(appointment.startsAt)} às ${formatTime(appointment.endsAt)}, ${statusLabel(appointment.status)}`} className={`timeline-appointment status-${appointment.status.toLowerCase()}${compact ? " is-compact" : ""}`} href={`/admin/agendamentos/${appointment.id}`} key={appointment.id} style={{ borderLeftColor: appointment.service.calendarColor, height: placement.height, top: placement.top }}><div className="timeline-appointment-main"><time>{formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}</time><strong>{appointment.client.preferredName ?? appointment.client.fullName}</strong><span>{appointment.service.name} · {appointment.durationMinutes} min</span></div><span className="timeline-status">{statusIcon(appointment.status)}{statusLabel(appointment.status)}</span></Link>;
      })}
      <CurrentTimeLine date={date} gridEndMinute={bounds.endsAtMinute} gridStartMinute={bounds.startsAtMinute} pixelsPerMinute={pixelsPerMinute} timezone={timezone} />
    </div></div>
    {canceledAppointments.length ? <div className="canceled-appointments"><strong>Cancelados</strong>{canceledAppointments.map((appointment) => <Link href={`/admin/agendamentos/${appointment.id}`} key={appointment.id}><X aria-hidden="true" size={14} />{formatTime(appointment.startsAt)} · {appointment.client.preferredName ?? appointment.client.fullName}</Link>)}</div> : null}
  </article>;
}

function getWorkingWindow(data: DailyAgendaData, resource: Resource, date: string) {
  const fallback = { start: 8 * 60, end: 20 * 60 };
  if (data.holiday?.isClosed) return { ...fallback, notice: `${data.holiday.name}: studio fechado nesta data.` };
  const exception = resource.availabilityExceptions[0];
  if (exception?.isClosed) return { ...fallback, notice: exception.note || "Profissional indisponível nesta data." };
  if (exception?.startsAtMinute != null && exception.endsAtMinute != null) return { start: exception.startsAtMinute, end: exception.endsAtMinute, notice: exception.note || "Horário especial nesta data." };
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const rule = resource.availabilityRules.find((item) => item.dayOfWeek === weekday);
  if (rule?.isEnabled && rule.endsAtMinute > rule.startsAtMinute) return { start: rule.startsAtMinute, end: rule.endsAtMinute, notice: null };
  return { ...fallback, notice: "Este profissional não atende neste dia." };
}

function spanForDate(startsAt: Date, endsAt: Date, date: string, timezone?: string) {
  return {
    startsAtMinute: dateKeyInTimezone(startsAt, timezone) === date ? minuteOfDayInTimezone(startsAt, timezone) : 0,
    endsAtMinute: dateKeyInTimezone(endsAt, timezone) === date ? minuteOfDayInTimezone(endsAt, timezone) : 24 * 60,
  };
}

function statusLabel(status: string) { return ({ SCHEDULED: "Agendado", AWAITING_CONFIRMATION: "Aguardando confirmação", CONFIRMED: "Confirmado", ARRIVED: "Chegou", IN_SERVICE: "Em atendimento", COMPLETED: "Concluído", CANCELED: "Cancelado", NO_SHOW: "Não compareceu" } as Record<string, string>)[status] ?? status; }
function statusIcon(status: string) { const Icon = status === "CONFIRMED" ? CircleCheckBig : status === "COMPLETED" ? CheckCheck : status === "NO_SHOW" ? UserRoundX : Circle; return <Icon aria-hidden="true" size={13} />; }
