"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { createInitialAdminAction, type InitialSetupFormState } from "./actions";

export function InitialSetupForm() {
  const [state, action, pending] = useActionState(createInitialAdminAction, {} as InitialSetupFormState);
  return <form action={action} className="login-form initial-setup-form" noValidate>
    <div className="field-group"><label htmlFor="name">Seu nome</label><input autoComplete="name" id="name" maxLength={120} name="name" required /></div>
    <div className="field-group"><label htmlFor="email">Seu e-mail</label><input autoComplete="email" id="email" maxLength={254} name="email" required type="email" /></div>
    <div className="field-group"><label htmlFor="password">Crie sua senha</label><input aria-describedby="admin-password-hint" autoComplete="new-password" id="password" maxLength={128} name="password" required type="password" /><small id="admin-password-hint">Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.</small></div>
    <div className="field-group"><label htmlFor="confirmPassword">Confirme sua senha</label><input autoComplete="new-password" id="confirmPassword" maxLength={128} name="confirmPassword" required type="password" /></div>
    <div className="setup-agreements">
      <label className="check-field"><input name="termsAccepted" required type="checkbox" /><span>Li e aceito os <a href="#termos-administracao">termos de administração</a>.</span></label>
      <label className="check-field"><input name="privacyAccepted" required type="checkbox" /><span>Li e aceito o <a href="#aviso-privacidade">aviso de privacidade</a>.</span></label>
      <label className="check-field"><input name="temporaryAccepted" required type="checkbox" /><span>Entendo que este acesso é temporário e poderá ser tornado definitivo ou removido depois.</span></label>
    </div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="button button-primary login-submit" disabled={pending} type="submit"><KeyRound size={18} />{pending ? "Protegendo seu acesso…" : "Criar acesso temporário"}</button>
  </form>;
}
