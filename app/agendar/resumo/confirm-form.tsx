"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { confirmBookingAction, type BookingState } from "../actions";

export function ConfirmBookingForm({ policyTitle }: { policyTitle: string }) {
  const [state, action, pending] = useActionState(confirmBookingAction, {} as BookingState);
  return <form action={action} className="booking-confirm-form"><label className="check-field policy-check"><input name="policyAccepted" required type="checkbox" /><span>Li e aceito {policyTitle}. Entendo as regras de cancelamento e reagendamento.</span></label>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><Check size={18} />{pending ? "Confirmando…" : "Confirmar agendamento"}</button></form>;
}
