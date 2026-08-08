"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { clientLoginAction, type ClientAuthState } from "../actions";

export function ClientLoginForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState(clientLoginAction, {} as ClientAuthState);
  return <form action={action} className="login-form" noValidate>
    <input name="returnTo" type="hidden" value={returnTo} />
    <div className="field-group"><label htmlFor="email">E-mail</label><input autoComplete="email" id="email" name="email" required type="email" /></div>
    <div className="field-group"><label htmlFor="password">Senha</label><input autoComplete="current-password" id="password" name="password" required type="password" /></div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="button button-primary login-submit" disabled={pending} type="submit"><LogIn size={18} />{pending ? "Entrando…" : "Entrar"}</button>
    <div className="client-auth-links"><Link href="/conta/recuperar">Esqueci minha senha</Link><Link href={`/conta/cadastro?returnTo=${encodeURIComponent(returnTo)}`}>Criar minha conta</Link></div>
  </form>;
}
