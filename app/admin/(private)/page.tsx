import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarPlus, Check, Clock3 } from "lucide-react";
import { getDashboardData } from "@/lib/admin/dashboard";
import { formatDate } from "@/lib/date-time";

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const time = (date: Date) => formatDate(date, { hour: "2-digit", minute: "2-digit", timeZone: data.timezone });
  return <main className="admin-page simple-dashboard">
    <div className="admin-page-heading">
      <div><p className="eyebrow">Sua rotina, organizada</p><h1>{data.greeting}.</h1><p>{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", timeZone: data.timezone })}</p></div>
      <Link className="button button-primary" href={`/admin/agendamentos/novo?date=${data.today}`}><CalendarPlus size={18} /> Novo agendamento</Link>
    </div>
    <section className="dashboard-metrics simple-metrics" aria-label="Resumo de hoje">
      <article><CalendarDays size={20} aria-hidden="true" /><strong>{data.todayAppointments.length}</strong><span>atendimentos hoje</span></article>
      <article><Check size={20} aria-hidden="true" /><strong>{data.completedToday}</strong><span>concluídos</span></article>
      <article><Clock3 size={20} aria-hidden="true" /><strong>{data.remainingToday}</strong><span>a seguir hoje</span></article>
    </section>
    <section className="admin-card">
      <div className="card-heading"><div><p className="eyebrow">Agenda de hoje</p><h2>Seu dia em um só lugar.</h2></div><Link href={`/admin/agenda?date=${data.today}`}>Abrir agenda <ArrowUpRight size={16} /></Link></div>
      {data.todayAppointments.length ? <ol className="simple-appointments">{data.todayAppointments.map((item) => <li key={item.id}><Link href={`/admin/agendamentos/${item.id}`}><time>{time(item.startsAt)}</time><span><strong>{item.client.preferredName ?? item.client.fullName}</strong><small>{item.service.name}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link></li>)}</ol> : <div className="empty-state"><CalendarDays size={28} aria-hidden="true" /><p>Nenhum atendimento para hoje.</p><span>Quando criar um horário, ele aparece aqui.</span><Link href={`/admin/agendamentos/novo?date=${data.today}`}>Agendar atendimento</Link></div>}
    </section>
    {data.upcoming.length ? <section className="admin-card upcoming-card"><div className="card-heading"><h2>Próximos dias</h2></div><ol className="simple-appointments">{data.upcoming.map((item) => <li key={item.id}><Link href={`/admin/agendamentos/${item.id}`}><time>{formatDate(item.startsAt, { day: "2-digit", month: "short", timeZone: data.timezone })}<small>{time(item.startsAt)}</small></time><span><strong>{item.client.preferredName ?? item.client.fullName}</strong><small>{item.service.name}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link></li>)}</ol></section> : null}
  </main>;
}
