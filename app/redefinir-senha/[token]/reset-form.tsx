"use client";
import { useActionState } from "react";
import { resetAccountPasswordAction, type ResetAccountState } from "./actions";
const initial: ResetAccountState = {};
export function AccountResetForm({ token }: { token: string }) { const [state, action, pending] = useActionState(resetAccountPasswordAction, initial); return <form action={action} className="saas-auth-form"><input name="token" type="hidden" value={token} /><label>Nova senha<input autoComplete="new-password" name="password" required type="password" /></label><label>Confirme a senha<input autoComplete="new-password" name="confirmPassword" required type="password" /></label>{state.error ? <p className="form-error">{state.error}</p> : null}<button className="button button-primary" disabled={pending}>{pending ? "Atualizando…" : "Definir nova senha"}</button></form>; }
