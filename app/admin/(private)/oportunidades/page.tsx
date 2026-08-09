import Link from "next/link";
import { CalendarPlus, CalendarSearch, Sparkles, UserRoundCheck, UserRoundX } from "lucide-react";
import { getOperationalOpportunities } from "@/lib/admin/opportunities";
import { formatDate, formatTime } from "@/lib/date-time";

export default async function OpportunitiesPage() {
  const data = await getOperationalOpportunities();
  return <main className="admin-page opportunities-page">
    <div className="admin-page-heading"><div><p className="eyebrow">Central operacional</p><h1>Oportunidades</h1><p>Pessoas e horários que merecem uma ação agora — calculados a partir da sua agenda real.</p></div><Link className="button button-primary" href={`/admin/agendamentos/novo?date=${data.today}`}><CalendarPlus size={18} /> Novo agendamento</Link></div>
    <div className="opportunity-grid">
      <OpportunityCard icon={CalendarSearch} title="Hora de voltar" description="Clientes na janela recomendada de retorno e sem novo horário." empty="Nenhuma cliente precisa de retorno nesta semana.">{data.returnsDue.map((client) => <ClientOpportunity client={client} detail={client.returnRecommendedAt ? `Retorno previsto: ${formatDate(client.returnRecommendedAt, { day: "2-digit", month: "short" })}` : "Retorno recomendado"} key={client.id} />)}</OpportunityCard>
      <OpportunityCard icon={UserRoundX} title="Cancelou e não remarcou" description="Cancelamentos dos últimos 60 dias que ainda não viraram um novo atendimento." empty="Todas as clientes canceladas já têm novo horário ou não há cancelamentos recentes.">{data.canceledWithoutRebooking.map((appointment) => <div className="opportunity-row" key={appointment.id}><div><strong>{appointment.client.preferredName ?? appointment.client.fullName}</strong><span>{appointment.service.name} · cancelado em {formatDate(appointment.startsAt, { day: "2-digit", month: "short" })}</span></div><Link href={`/admin/agendamentos/novo?date=${data.today}&clientId=${appointment.client.id}`}>Remarcar</Link></div>)}</OpportunityCard>
      <OpportunityCard icon={UserRoundCheck} title="Nova sem segunda visita" description="Clientes novas com uma única visita concluída." empty="Nenhuma cliente nova precisa de uma segunda visita agora.">{data.newWithoutSecondVisit.map((client) => <ClientOpportunity client={client} detail={client.firstAppointmentAt ? `Primeira visita: ${formatDate(client.firstAppointmentAt, { day: "2-digit", month: "short" })}` : "Primeira visita recente"} key={client.id} />)}</OpportunityCard>
      <OpportunityCard icon={Sparkles} title="Aniversariantes de hoje" description="Uma oportunidade humana de se aproximar." empty="Não há aniversariantes cadastradas hoje.">{data.birthdays.map((client) => <ClientOpportunity client={client} detail="Aniversário hoje" key={client.id} />)}</OpportunityCard>
    </div>
    <section className="admin-card opportunity-schedule-card"><div className="card-heading"><div><p className="eyebrow">Agenda de amanhã</p><h2>{data.tomorrowAppointments.length ? `${data.tomorrowAppointments.length} horário${data.tomorrowAppointments.length > 1 ? "s" : ""} confirmado${data.tomorrowAppointments.length > 1 ? "s" : ""}` : "Amanhã ainda está livre"}</h2></div><Link href={`/admin/agenda?date=${data.today}`}>Abrir agenda</Link></div><p>{data.tomorrowAppointments.length ? `Os próximos horários começam às ${formatTime(data.tomorrowAppointments[0].startsAt)}. Veja a agenda para identificar janelas que podem ser preenchidas.` : "Crie um horário ou entre em contato com clientes no período ideal para retorno."}</p></section>
  </main>;
}

function OpportunityCard({ children, description, empty, icon: Icon, title }: { children: React.ReactNode; description: string; empty: string; icon: typeof Sparkles; title: string }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="admin-card opportunity-card"><div className="opportunity-card-heading"><Icon size={19} aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div></div>{hasItems ? <div className="opportunity-list">{children}</div> : <p className="opportunity-empty">{empty}</p>}</section>;
}

function ClientOpportunity({ client, detail }: { client: { id: string; fullName: string; preferredName: string | null }; detail: string }) {
  return <div className="opportunity-row"><div><strong>{client.preferredName ?? client.fullName}</strong><span>{detail}</span></div><Link href={`/admin/agendamentos/novo?clientId=${client.id}`}>Agendar</Link></div>;
}
