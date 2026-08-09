"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { confirmBookingAction, type BookingState } from "../actions";

export function ConfirmBookingForm({ policyTitle, signedIn }: { policyTitle: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState(confirmBookingAction, {} as BookingState);
  return <form action={action} className="booking-confirm-form">{!signedIn ? <><div className="form-grid two-columns"><div className="field-group form-wide"><label htmlFor="fullName">Seu nome completo</label><input autoComplete="name" id="fullName" maxLength={150} name="fullName" required /></div><div className="field-group"><label htmlFor="whatsapp">WhatsApp</label><input autoComplete="tel" id="whatsapp" inputMode="tel" maxLength={30} name="whatsapp" required /></div><div className="field-group"><label htmlFor="email">E-mail <span>opcional</span></label><input autoComplete="email" id="email" maxLength={254} name="email" type="email" /></div></div><label className="check-field policy-check"><input name="dataAccepted" required type="checkbox" /><span>Autorizo o studio a usar estes dados para organizar este atendimento.</span></label></> : null}<label className="check-field policy-check"><input name="policyAccepted" required type="checkbox" /><span>Li e aceito {policyTitle}. Entendo as regras de cancelamento e reagendamento.</span></label>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><Check size={18} />{pending ? "Confirmando…" : "Confirmar agendamento"}</button></form>;
}
