"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { requestRecoveryAction, type ClientAuthState } from "../actions";

export function RecoveryForm() {
  const [state, action, pending] = useActionState(requestRecoveryAction, {} as ClientAuthState);
  return <form action={action} className="login-form" noValidate><div className="field-group"><label htmlFor="email">E-mail da conta</label><input autoComplete="email" id="email" name="email" required type="email" /></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary login-submit" disabled={pending} type="submit"><Send size={18} />{pending ? "Enviando…" : "Solicitar ajuda"}</button></form>;
}
