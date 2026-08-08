"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { createStaffAction, toggleStaffAction, type StaffFormState } from "./actions";

const initialState: StaffFormState = {};

export function StaffForm() {
  const [state, action, isPending] = useActionState(createStaffAction, initialState);
  return <form action={action} className="editor-form">
    <input name="role" type="hidden" value="RECEPTIONIST" />
    <div className="form-grid two-columns">
      <div className="field-group"><label htmlFor="staff-name">Nome</label><input autoComplete="name" id="staff-name" maxLength={150} name="name" required /></div>
      <div className="field-group"><label htmlFor="staff-email">E-mail de acesso</label><input autoComplete="email" id="staff-email" maxLength={254} name="email" required type="email" /></div>
      <div className="field-group form-wide"><label htmlFor="staff-password">Senha inicial</label><input autoComplete="new-password" id="staff-password" minLength={12} name="password" required type="password" /><small>A pessoa deverá receber a senha por um canal seguro.</small></div>
    </div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
    <button className="button button-primary" disabled={isPending} type="submit"><Save size={18} />{isPending ? "Criando…" : "Criar acesso de recepcionista"}</button>
  </form>;
}

export function StaffStatusForm({ isActive, userId }: { isActive: boolean; userId: string }) {
  return <form action={toggleStaffAction} onSubmit={(event) => { if (!window.confirm(`${isActive ? "Desativar" : "Ativar"} este acesso da equipe?`)) event.preventDefault(); }}><input name="userId" type="hidden" value={userId} /><button className="secondary-action" type="submit">{isActive ? "Desativar" : "Ativar"}</button></form>;
}
