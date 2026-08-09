"use client";

import { WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { recordPaymentAction, updateAppointmentStatusAction, type AppointmentActionState } from "./actions";

const initialState: AppointmentActionState = {};

type PaymentSummary = {
  amountDueCents: number | null;
  amountPaidCents: number;
  depositAmountCents: number | null;
  depositPaidCents: number;
  depositRequired: boolean;
  method: "PIX" | "CARD" | "CASH" | "TRANSFER" | null;
};

export function AppointmentPrimaryActions({ appointmentId, payment, status }: { appointmentId: string; payment: PaymentSummary | null; status: string }) {
  return <section className="detail-action-grid"><StatusForm appointmentId={appointmentId} status={status} /><PaymentForm appointmentId={appointmentId} payment={payment} /></section>;
}

function StatusForm({ appointmentId, status }: { appointmentId: string; status: string }) {
  const [state, action, pending] = useActionState(updateAppointmentStatusAction, initialState);
  useRefreshAfterSuccess(state.success);
  const canceled = status === "CANCELED";
  return <article className="admin-card"><p className="eyebrow">Status do atendimento</p><form action={action} className="inline-form"><input name="appointmentId" type="hidden" value={appointmentId} /><label className="sr-only" htmlFor="appointment-status">Status</label><select defaultValue={canceled ? "SCHEDULED" : status} disabled={canceled || pending} id="appointment-status" key={status} name="status"><option value="SCHEDULED">Agendado</option><option value="CONFIRMED">Confirmado</option><option value="ARRIVED">Cliente chegou</option><option value="IN_SERVICE">Em atendimento</option><option value="COMPLETED">Concluído</option><option value="NO_SHOW">Não compareceu</option></select><button className="button button-primary" disabled={canceled || pending} type="submit">{pending ? "Atualizando…" : "Atualizar"}</button></form>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}</article>;
}

function PaymentForm({ appointmentId, payment }: { appointmentId: string; payment: PaymentSummary | null }) {
  const [state, action, pending] = useActionState(recordPaymentAction, initialState);
  useRefreshAfterSuccess(state.success);
  if (!payment) return <article className="admin-card"><p className="eyebrow">Pagamento presencial</p><p className="muted-copy">Este atendimento não possui pagamento pendente.</p></article>;
  return <article className="admin-card"><p className="eyebrow">Pagamento presencial</p>{payment.depositRequired && payment.depositAmountCents ? <p className="deposit-note">Sinal configurado: <strong>{currency(payment.depositAmountCents)}</strong> · {payment.depositPaidCents >= payment.depositAmountCents ? "registrado" : "pendente"}</p> : null}<form action={action} className="payment-form"><input name="appointmentId" type="hidden" value={appointmentId} /><div className="field-group"><label htmlFor="amount">Valor recebido acumulado</label><input defaultValue={payment.amountPaidCents ? (payment.amountPaidCents / 100).toFixed(2).replace(".", ",") : ""} id="amount" inputMode="decimal" maxLength={30} name="amount" placeholder="0,00" required /></div><div className="field-group"><label htmlFor="method">Forma de pagamento</label><select defaultValue={payment.method ?? "PIX"} id="method" name="method"><option value="PIX">Pix</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option><option value="TRANSFER">Transferência</option></select></div><button className="button button-primary" disabled={pending} type="submit"><WalletCards aria-hidden="true" size={17} />{pending ? "Registrando…" : "Registrar pagamento"}</button></form>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}</article>;
}

function useRefreshAfterSuccess(success?: string) {
  const router = useRouter();
  useEffect(() => { if (success) router.refresh(); }, [router, success]);
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}
