import Link from "next/link";
import { ArrowRight, CalendarPlus, Check, Circle, CircleDollarSign, Clock3, UsersRound } from "lucide-react";
import { getDashboardData } from "@/lib/admin/dashboard";
import { formatDate, formatTime } from "@/lib/date-time";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const params = await searchParams;
  const data = await getDashboardData();
  const firstUsePending = data.totalServices === 0 || data.availabilityRules === 0 || data.totalClients === 0 || data.totalAppointments === 0;

  return (
    <main className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">Visão geral</p><h1>Seu dia em ordem.</h1><p>{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p></div>
        <Link className="button button-primary" href={`/admin/agendamentos/novo?date=${data.today}`}><CalendarPlus size={18} /> Novo agendamento</Link>
      </div>

      {params.welcome === "1" ? <p className="form-success dashboard-welcome" role="status">Seu acesso foi criado com segurança. A agenda está vazia e pronta para receber as suas configurações.</p> : null}
      {firstUsePending ? <FirstUseGuide data={data} /> : null}

      <section className="dashboard-metrics" aria-label="Resumo da agenda">
        <article><Clock3 size={20} aria-hidden="true" /><strong>{data.todayAppointments.length}</strong><span>atendimentos hoje</span></article>
        <article><CircleDollarSign size={20} aria-hidden="true" /><strong>{data.pendingPayments}</strong><span>pagamentos pendentes</span></article>
        <article><UsersRound size={20} aria-hidden="true" /><strong>{data.totalClients}</strong><span>clientes cadastradas</span></article>
      </section>

      <section className="dashboard-grid">
        <article className="admin-card today-card">
          <div className="card-heading"><div><p className="eyebrow">Agenda de hoje</p><h2>Próximos horários</h2></div><Link href={`/admin/agenda?date=${data.today}`}>Ver agenda</Link></div>
          {data.todayAppointments.length ? <ol className="appointment-list">{data.todayAppointments.map((appointment) => <li key={appointment.id}><time>{formatTime(appointment.startsAt)}</time><div><strong>{appointment.client.preferredName ?? appointment.client.fullName}</strong><span>{appointment.service.name}</span></div><i style={{ backgroundColor: appointment.service.calendarColor }} /></li>)}</ol> : <EmptyState title="Nenhum atendimento para hoje" description="Quando um horário for marcado, ele aparecerá aqui." actionHref={`/admin/agendamentos/novo?date=${data.today}`} actionLabel="Marcar horário" />}
        </article>
        <article className="admin-card attention-card">
          <p className="eyebrow">Atenção hoje</p>
          <div className="attention-item"><span>Cancelamentos de hoje</span><strong>{data.recentCancellations}</strong></div>
          <div className="attention-item"><span>Valores aguardando registro</span><strong>{data.pendingPayments}</strong></div>
          <div className="attention-item"><span>Pedidos de ajuda com acesso</span><strong>{data.recoveryRequests.length}</strong></div>
          {data.recoveryRequests.length ? <div className="recovery-request-links">{data.recoveryRequests.map((request) => <Link href={`/admin/clientes/${request.client.id}`} key={request.id}>{request.client.preferredName ?? request.client.fullName}</Link>)}</div> : null}
          <p className="card-note">Os pagamentos são registrados manualmente após o atendimento.</p>
        </article>
      </section>

      <section className="admin-card upcoming-card"><div className="card-heading"><div><p className="eyebrow">Próximos atendimentos</p><h2>O que vem a seguir</h2></div></div>{data.upcoming.length ? <ol className="upcoming-list">{data.upcoming.map((appointment) => <li key={appointment.id}><span>{formatDate(appointment.startsAt, { day: "2-digit", month: "short" })} · {formatTime(appointment.startsAt)}</span><strong>{appointment.client.preferredName ?? appointment.client.fullName}</strong><em>{appointment.service.name}</em></li>)}</ol> : <EmptyState title="Sem próximos atendimentos" description="Crie o primeiro horário quando a cliente confirmar pelo WhatsApp." />}</section>
    </main>
  );
}

function FirstUseGuide({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const steps = [
    { complete: data.totalServices > 0, href: "/admin/servicos/novo", title: "Cadastre um serviço", description: "Informe duração, valor e regras do atendimento." },
    { complete: data.availabilityRules > 0, href: "/admin/configuracoes/horarios", title: "Defina os horários", description: "Configure dias de atendimento e intervalos." },
    { complete: data.totalClients > 0, href: "/admin/clientes/novo", title: "Cadastre a primeira cliente", description: "Use dados reais somente quando estiver pronta." },
    { complete: data.totalAppointments > 0, href: "/admin/agendamentos/novo", title: "Crie o primeiro agendamento", description: "A agenda valida disponibilidade e conflitos." },
  ];
  const next = steps.find((step) => !step.complete);
  return <section className="first-use-card"><div className="first-use-heading"><div><p className="eyebrow">Primeiros passos</p><h2>Prepare a agenda no seu ritmo.</h2><p>Nenhum cliente ou horário foi inserido automaticamente.</p></div>{next ? <Link className="button button-primary" href={next.href}>{next.title}<ArrowRight size={17} /></Link> : null}</div><ol>{steps.map((step) => <li className={step.complete ? "complete" : ""} key={step.title}>{step.complete ? <Check size={17} /> : <Circle size={17} />}<div><strong>{step.title}</strong><span>{step.description}</span></div></li>)}</ol></section>;
}

function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return <div className="empty-state"><p>{title}</p><span>{description}</span>{actionHref && actionLabel ? <Link href={actionHref}>{actionLabel}</Link> : null}</div>;
}
