"use client";

import { useActionState } from "react";
import { CalendarCheck, CalendarSync, XCircle } from "lucide-react";
import { processAppointmentLinkAction, type LinkActionState } from "./actions";

export function AppointmentLinkActionForm({ token, purpose }: { token: string; purpose: "CONFIRM" | "CANCEL" | "RESCHEDULE" }) {
  const [state, action, pending] = useActionState(processAppointmentLinkAction, {} as LinkActionState);
  if (state.success) return <p className="link-action-success" role="status">{state.success}</p>;
  const Icon = purpose === "CONFIRM" ? CalendarCheck : purpose === "CANCEL" ? XCircle : CalendarSync;
  const label = purpose === "CONFIRM" ? "Confirmar minha presença" : purpose === "CANCEL" ? "Cancelar agendamento" : "Enviar solicitação";
  return <form action={action} className="link-action-form"><input name="token" type="hidden" value={token} />{purpose !== "CONFIRM" ? <div className="field-group"><label htmlFor="reason">{purpose === "CANCEL" ? "Motivo do cancelamento" : "Como podemos ajudar no reagendamento?"}</label><textarea id="reason" maxLength={500} name="reason" placeholder={purpose === "RESCHEDULE" ? "Ex.: prefiro manhãs de terça ou quinta" : "Conte brevemente o motivo"} required /></div> : <p>Ao confirmar, sua presença será atualizada imediatamente na agenda do studio.</p>}{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className={`button ${purpose === "CANCEL" ? "button-danger" : "button-primary"}`} disabled={pending} type="submit"><Icon size={18} />{pending ? "Processando…" : label}</button></form>;
}
