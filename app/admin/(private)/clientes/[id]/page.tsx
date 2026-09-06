import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MessageCircle, ShieldCheck } from "lucide-react";
import { getClientProfile } from "@/lib/admin/clients";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatTime } from "@/lib/date-time";
import { decryptSensitiveData, emptySensitiveClientData } from "@/lib/security/sensitive-data";
import { whatsappLink } from "@/lib/studio";
import { ClientAccessForm, ClientDetailsForm, HealthProfileForm, PrivacyRequestForm } from "./client-profile-forms";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const client = await getClientProfile(id);
  if (!client) notFound();
  const whatsapp = client.whatsapp ? whatsappLink(client.whatsapp, `Olá, ${client.preferredName ?? client.fullName}.`) : null;
  const mayViewSensitive = can(staff.role, "SENSITIVE_CLIENT_VIEW");
  let health = emptySensitiveClientData();
  let healthUnavailable = false;
  if (mayViewSensitive && client.healthProfile) {
    try { health = decryptSensitiveData(client.healthProfile.encryptedPayload); } catch { healthUnavailable = true; }
  }

  return <main className="admin-page profile-page">
    <Link className="back-link" href="/admin/clientes"><ArrowLeft aria-hidden="true" size={17} /> Voltar para clientes</Link>
    <section className="client-profile-header"><div><p className="eyebrow">Perfil da cliente</p><h1>{client.preferredName ?? client.fullName}</h1><p>{client.fullName !== client.preferredName && client.preferredName ? client.fullName : statusLabel(client.status)}</p></div>{whatsapp ? <a className="button button-primary" href={whatsapp} rel="noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={18} /> WhatsApp</a> : null}</section>
    <section className="profile-summary"><article><span>Atendimentos</span><strong>{client.appointments.length}</strong></article><article><span>Último atendimento</span><strong>{client.lastAppointmentAt ? formatDate(client.lastAppointmentAt, { day: "2-digit", month: "short" }) : "—"}</strong></article><article><span>Próximo retorno</span><strong>{client.returnRecommendedAt ? formatDate(client.returnRecommendedAt, { day: "2-digit", month: "short" }) : "—"}</strong></article></section>
    <section className="profile-grid">
      <article className="admin-card"><p className="eyebrow">Contato</p><dl className="detail-list"><div><dt>WhatsApp</dt><dd>{client.whatsapp ?? "Não informado"}</dd></div><div><dt>Telefone</dt><dd>{client.phone ?? "Não informado"}</dd></div><div><dt>E-mail</dt><dd>{client.email ?? "Não informado"}</dd></div><div><dt>Cidade</dt><dd>{client.city ?? "Não informado"}</dd></div></dl><details className="progressive-fields"><summary>Editar dados de contato</summary><ClientDetailsForm client={client} /></details><details className="progressive-fields"><summary>Acesso da cliente</summary><ClientAccessForm clientId={client.id} hasAccount={Boolean(client.account)} hasOpenRequest={client.recoveryRequests.some((request) => request.status === "OPEN")} whatsapp={client.whatsapp} /></details></article>
      <article className="admin-card"><p className="eyebrow">Histórico de atendimentos</p>{client.appointments.length ? <ol className="timeline">{client.appointments.map((appointment) => <li key={appointment.id}><span><CalendarDays aria-hidden="true" size={15} /></span><div><strong>{appointment.service.name}</strong><p>{formatDate(appointment.startsAt, { day: "2-digit", month: "long", year: "numeric" })} · {formatTime(appointment.startsAt)} · {appointmentStatus(appointment.status)}</p></div></li>)}</ol> : <div className="empty-state"><p>Sem atendimentos registrados.</p><span>O histórico aparecerá após o primeiro agendamento.</span></div>}</article>
    </section>
    <details className="progressive-fields profile-extra"><summary>Informações de atendimento</summary>{mayViewSensitive ? <section className="editor-card sensitive-section"><div className="section-inline-heading"><div><p className="eyebrow">Informações importantes</p><h2>Relatos da cliente</h2></div><ShieldCheck aria-hidden="true" size={24} /></div>{healthUnavailable ? <p className="form-error" role="alert">Os dados protegidos não puderam ser abertos. Verifique a chave de criptografia antes de editar.</p> : <HealthProfileForm clientId={client.id} initial={health} />}</section> : <section className="admin-card restricted-data-note"><ShieldCheck aria-hidden="true" size={20} /><div><strong>Informações sensíveis protegidas</strong><p>Seu perfil não possui permissão para visualizar esses dados.</p></div></section>}
    </details><details className="progressive-fields profile-extra"><summary>Privacidade</summary><section className="profile-grid consent-grid"><article className="admin-card"><p className="eyebrow">Privacidade e LGPD</p><PrivacyRequestForm clientId={client.id} />{client.privacyRequests.length ? <ol className="compact-history">{client.privacyRequests.map((request) => <li key={request.id}><ShieldCheck aria-hidden="true" size={15} /><span><strong>{privacyType(request.type)}</strong><small>{privacyStatus(request.status)} · {formatDate(request.createdAt, { day: "2-digit", month: "short", year: "numeric" })}</small></span></li>)}</ol> : null}</article></section></details>
  </main>;
}

function statusLabel(status: string) { return ({ NEW: "Cliente nova", ACTIVE: "Cliente ativa", RECURRING: "Cliente recorrente", INACTIVE: "Cliente inativa", BLOCKED: "Cliente bloqueada", FOLLOW_UP_DUE: "Retorno pendente", PAYMENT_DUE: "Pagamento pendente" } as Record<string, string>)[status] ?? status; }
function appointmentStatus(status: string) { return ({ COMPLETED: "Concluído", CANCELED: "Cancelado", NO_SHOW: "Não compareceu", AWAITING_CONFIRMATION: "Aguardando confirmação", CONFIRMED: "Confirmado", ARRIVED: "Cliente chegou", IN_SERVICE: "Em atendimento", SCHEDULED: "Agendado" } as Record<string, string>)[status] ?? status; }
function privacyType(type: string) { return ({ EXPORT: "Exportação de dados", CORRECTION: "Correção de dados", DELETION: "Exclusão dos dados" } as Record<string, string>)[type] ?? type; }
function privacyStatus(status: string) { return ({ OPEN: "Aberta", IN_PROGRESS: "Em análise", COMPLETED: "Concluída", DECLINED: "Recusada" } as Record<string, string>)[status] ?? status; }
