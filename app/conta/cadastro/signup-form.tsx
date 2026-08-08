"use client";

import Link from "next/link";
import { useActionState } from "react";
import { UserRoundPlus } from "lucide-react";
import { clientSignupAction, type ClientAuthState } from "../actions";

export function ClientSignupForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState(clientSignupAction, {} as ClientAuthState);
  return <form action={action} className="login-form client-signup-form" noValidate>
    <input name="returnTo" type="hidden" value={returnTo} />
    <div className="field-group"><label htmlFor="fullName">Nome completo</label><input autoComplete="name" id="fullName" name="fullName" required /></div>
    <div className="field-group"><label htmlFor="preferredName">Como prefere ser chamada <span>opcional</span></label><input id="preferredName" maxLength={80} name="preferredName" /></div>
    <div className="field-group"><label htmlFor="whatsapp">WhatsApp</label><input autoComplete="tel" id="whatsapp" inputMode="tel" name="whatsapp" placeholder="(00) 00000-0000" required /></div>
    <div className="field-group"><label htmlFor="email">E-mail</label><input autoComplete="email" id="email" name="email" required type="email" /></div>
    <div className="field-group"><label htmlFor="password">Crie uma senha</label><input aria-describedby="password-hint" autoComplete="new-password" id="password" name="password" required type="password" /><small id="password-hint">Use 10 caracteres, com maiúscula, minúscula e número.</small></div>
    <div className="field-group"><label htmlFor="confirmPassword">Confirme a senha</label><input autoComplete="new-password" id="confirmPassword" name="confirmPassword" required type="password" /></div>
    <label className="check-field"><input name="privacyAccepted" required type="checkbox" />Autorizo o uso dos dados necessários para cadastro e agendamento.</label>
    <label className="check-field"><input name="communicationAccepted" type="checkbox" />Aceito receber lembretes e orientações sobre meus atendimentos.</label>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="button button-primary login-submit" disabled={pending} type="submit"><UserRoundPlus size={18} />{pending ? "Criando conta…" : "Criar conta"}</button>
    <p className="auth-footnote">Já tem acesso? <Link href={`/conta/entrar?returnTo=${encodeURIComponent(returnTo)}`}>Entrar</Link></p>
  </form>;
}
