import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, WalletCards } from "lucide-react";
import { getAppointment } from "@/lib/admin/agenda";
import { dateKeyInTimezone, formatDate, formatTime } from "@/lib/date-time";
import { whatsappLink } from "@/lib/studio";
import { recordPaymentAction, updateAppointmentStatusAction } from "./actions";
import { AppointmentManagement, WhatsappPanel } from "./appointment-management";

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appointment = await getAppointment(id);
  if (!appointment) notFound();
  const latestMessage = appointment.messageLogs[0] ?? null;
  const messageBody = latestMessage?.body ?? `Olá, ${appointment.client.preferredName ?? appointment.client.fullName}. Seu horário para ${appointment.service.name} está marcado para ${formatDate(appointment.startsAt, { day: "2-digit", month: "long" })}, às ${formatTime(appointment.startsAt)}.`;
  const whatsapp = appointment.client.whatsapp ? whatsappLink(appointment.client.whatsapp, messageBody) : null;
  const locked = appointment.status === "COMPLETED" || appointment.status === "CANCELED";

  return <main className="admin-page editor-page appointment-detail">
    <Link className="back-link" href={`/admin/agenda?date=${dateKeyInTimezone(appointment.startsAt)}`}><ArrowLeft size={17} /> Voltar para agenda</Link>
    <div className="editor-heading"><p className="eyebrow">Agendamento {appointment.code}</p><h1>{appointment.client.preferredName ?? appointment.client.fullName}</h1><p><CalendarClock size={16} /> {formatDate(appointment.startsAt, { weekday: "long", day: "numeric", month: "long" })} às {formatTime(appointment.startsAt)} · {appointment.service.name}</p></div>
    {appointment.status === "CANCELED" ? <p className="canceled-notice">Cancelado{appointment.cancellationReason ? ` · ${appointment.cancellationReason}` : ""}</p> : null}

    <section className="detail-action-grid">
      <article className="admin-card"><p className="eyebrow">Status do atendimento</p><form action={updateAppointmentStatusAction} className="inline-form"><input name="appointmentId" type="hidden" value={appointment.id} /><label className="sr-only" htmlFor="appointment-status">Status</label><select defaultValue={appointment.status === "CANCELED" ? "SCHEDULED" : appointment.status} disabled={appointment.status === "CANCELED"} id="appointment-status" name="status"><option value="SCHEDULED">Agendado</option><option value="CONFIRMED">Confirmado</option><option value="ARRIVED">Cliente chegou</option><option value="IN_SERVICE">Em atendimento</option><option value="COMPLETED">Concluído</option><option value="NO_SHOW">Não compareceu</option></select><button className="button button-primary" disabled={appointment.status === "CANCELED"} type="submit">Atualizar</button></form></article>
      <article className="admin-card"><p className="eyebrow">Pagamento presencial</p>{appointment.payment ? <>{appointment.payment.depositRequired && appointment.payment.depositAmountCents ? <p className="deposit-note">Sinal configurado: <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(appointment.payment.depositAmountCents / 100)}</strong> · {appointment.payment.depositPaidCents >= appointment.payment.depositAmountCents ? "registrado" : "pendente"}</p> : null}<form action={recordPaymentAction} className="payment-form"><input name="appointmentId" type="hidden" value={appointment.id} /><div className="field-group"><label htmlFor="amount">Valor recebido acumulado</label><input defaultValue={appointment.payment.amountPaidCents ? (appointment.payment.amountPaidCents / 100).toFixed(2).replace(".", ",") : ""} id="amount" inputMode="decimal" name="amount" placeholder="0,00" required /></div><div className="field-group"><label htmlFor="method">Forma de pagamento</label><select defaultValue={appointment.payment.method ?? "PIX"} id="method" name="method"><option value="PIX">Pix</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option><option value="TRANSFER">Transferência</option></select></div><button className="button button-primary" type="submit"><WalletCards size={17} /> Registrar pagamento</button></form></> : <p className="muted-copy">Este atendimento não possui pagamento pendente.</p>}</article>
    </section>

    <WhatsappPanel appointmentId={appointment.id} link={whatsapp} messageId={latestMessage?.id ?? null} messageStatus={latestMessage?.status ?? null} />
    <AppointmentManagement appointmentId={appointment.id} date={dateKeyInTimezone(appointment.startsAt)} disabled={locked} time={formatTime(appointment.startsAt)} />

    <section className="admin-card"><p className="eyebrow">Histórico do agendamento</p><ol className="timeline">{appointment.events.length ? appointment.events.map((event) => <li key={event.id}><span><CalendarClock size={15} /></span><div><strong>{eventLabel(event.type)}</strong><p>{formatDate(event.createdAt, { day: "2-digit", month: "short", year: "numeric" })} · {formatTime(event.createdAt)}{event.actor?.name ? ` por ${event.actor.name}` : ""}{event.reason ? ` · ${event.reason}` : ""}</p></div></li>) : <li>Sem eventos registrados.</li>}</ol></section>
  </main>;
}

function eventLabel(type: string) {
  return ({ CREATED: "Agendamento criado", STATUS_CHANGED: "Status atualizado", RESCHEDULED: "Reagendado", CANCELED: "Cancelado", MESSAGE_PREPARED: "Mensagem preparada", MESSAGE_MANUALLY_SENT: "Mensagem marcada como enviada" } as Record<string, string>)[type] ?? type;
}
