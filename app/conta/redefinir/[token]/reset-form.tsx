"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { resetClientPasswordAction, type ResetState } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetClientPasswordAction, {} as ResetState);
  return <form action={action} className="login-form"><input name="token" type="hidden" value={token} /><div className="field-group"><label htmlFor="password">Nova senha</label><input aria-describedby="password-hint" autoComplete="new-password" id="password" name="password" required type="password" /><small id="password-hint">Use 10 caracteres, com maiúscula, minúscula e número.</small></div><div className="field-group"><label htmlFor="confirmPassword">Confirme a nova senha</label><input autoComplete="new-password" id="confirmPassword" name="confirmPassword" required type="password" /></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button button-primary login-submit" disabled={pending} type="submit"><KeyRound size={18} />{pending ? "Atualizando…" : "Definir nova senha"}</button></form>;
}
