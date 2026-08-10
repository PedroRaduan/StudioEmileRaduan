import Link from "next/link";
import { ArrowRight, CalendarPlus, Check, Circle, CircleDollarSign, Clock3, Percent, UsersRound } from "lucide-react";
import { formatMinutesForHumans, getDashboardData } from "@/lib/admin/dashboard";
import { formatDate, formatTime } from "@/lib/date-time";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const params = await searchParams;
  const data = await getDashboardData();
  const firstUsePending = data.totalServices === 0 || data.availabilityRules === 0 || data.totalClients === 0 || data.totalAppointments === 0;
  const { metrics } = data;

  return (
    <main className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">Central operacional</p><h1>{data.greeting}, vamos cuidar do seu studio.</h1><p>Veja o que merece atenção hoje, {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", timeZone: data.timezone })}.</p></div>
        <Link className="button button-primary" href={`/admin/agendamentos/novo?date=${data.today}`}><CalendarPlus size={18} /> Novo agendamento</Link>
      </div>

      {params.welcome === "1" ? <p className="form-success dashboard-welcome" role="status">Seu acesso foi criado com segurança. A agenda está pronta para receber as suas configurações.</p> : null}
      {firstUsePending ? <FirstUseGuide data={data} /> : null}

      <section className="dashboard-metrics operational-metrics" aria-label="Resumo operacional de hoje">
        <Metric icon={Clock3} value={String(data.todayAppointments.length)} label="agendamentos hoje" />
        <Metric icon={UsersRound} value={String(metrics.completedToday)} label="clientes atendidos" />
        <Metric icon={Clock3} value={String(metrics.remainingToday)} label="clientes restantes" />
        <Metric icon={CircleDollarSign} value={formatCurrency(metrics.confirmedRevenueCents)} label="faturamento confirmado" />
        <Metric icon={CircleDollarSign} value={formatCurrency(metrics.forecastRevenueCents)} label="faturamento previsto" />
        <Metric icon={Percent} value={`${metrics.occupancyRate}%`} label="ocupação de hoje" />
      </section>

      <section className="dashboard-grid">
        <article className="admin-card today-card">
          <div className="card-heading"><div><p className="eyebrow">Agenda de hoje</p><h2>Próximos horários</h2></div><Link href={`/admin/agenda?date=${data.today}`}>Ver agenda</Link></div>
          {data.todayAppointments.length ? <ol className="appointment-list">{data.todayAppointments.filter((appointment) => appointment.status !== "CANCELED").map((appointment) => <li key={appointment.id}><time>{formatTime(appointment.startsAt)}</time><div><strong>{appointment.client.preferredName ?? appointment.client.fullName}</strong><span>{appointment.service.name}</span></div><i style={{ backgroundColor: appointment.service.calendarColor }} /></li>)}</ol> : <EmptyState title="Seu dia ainda está livre." description="Crie o primeiro horário e a agenda começará a trabalhar com você." actionHref={`/admin/agendamentos/novo?date=${data.today}`} actionLabel="Criar agendamento" />}
        </article>
        <article className="admin-card attention-card">
          <div className="card-heading"><div><p className="eyebrow">Atenção hoje</p><h2>Ações que ajudam agora</h2></div><Link href="/admin/oportunidades">Ver oportunidades</Link></div>
          <Attention href={`/admin/agenda?date=${data.today}`} action="Ver agenda" text={metrics.awaitingConfirmation ? `${metrics.awaitingConfirmation} cliente${metrics.awaitingConfirmation > 1 ? "s" : ""} ainda não confirmou presença.` : "Nenhuma confirmação pendente para hoje."} />
          <Attention href={`/admin/agenda?date=${data.today}`} action="Preencher horário" text={formatMinutesForHumans(metrics.vacantMinutes)} />
          <Attention href="/admin/oportunidades" action="Ver clientes" text={data.returnOpportunities.length ? `${data.returnOpportunities.length} cliente${data.returnOpportunities.length > 1 ? "s estão" : " está"} no período ideal para retorno.` : "Nenhum retorno pendente nesta semana."} />
          {data.tomorrowCancellations.map((appointment) => <Attention href={`/admin/agendamentos/${appointment.id}`} key={appointment.id} action="Recuperar vaga" text={`Uma cliente cancelou amanhã às ${formatTime(appointment.startsAt)} · potencial de ${formatCurrency(appointment.priceCents ?? 0)}.`} />)}
        </article>
      </section>

      <section className="admin-card upcoming-card"><div className="card-heading"><div><p className="eyebrow">Próximos atendimentos</p><h2>O que vem a seguir</h2></div></div>{data.upcoming.length ? <ol className="upcoming-list">{data.upcoming.map((appointment) => <li key={appointment.id}><span>{formatDate(appointment.startsAt, { day: "2-digit", month: "short" })} · {formatTime(appointment.startsAt)}</span><strong>{appointment.client.preferredName ?? appointment.client.fullName}</strong><em>{appointment.service.name}</em></li>)}</ol> : <EmptyState title="Sem próximos atendimentos" description="Crie o primeiro horário quando a cliente confirmar pelo WhatsApp." />}</section>
    </main>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Clock3; value: string; label: string }) {
  return <article><Icon size={20} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></article>;
}

function Attention({ action, href, text }: { action: string; href: string; text: string }) {
  return <div className="attention-item attention-action"><span>{text}</span><Link href={href}>{action}<ArrowRight size={14} /></Link></div>;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value / 100);
}
