"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { createClientAction, type ClientFormState } from "./actions";

const initialState: ClientFormState = {};

export function ClientForm() {
  const [state, action, isPending] = useActionState(createClientAction, initialState);
  return <form action={action} className="editor-form">
    <div className="form-grid two-columns">
      <div className="field-group"><label htmlFor="fullName">Nome completo</label><input id="fullName" maxLength={150} name="fullName" required /></div>
      <div className="field-group"><label htmlFor="preferredName">Como prefere ser chamada <span>opcional</span></label><input id="preferredName" maxLength={150} name="preferredName" /></div>
      <div className="field-group"><label htmlFor="whatsapp">WhatsApp <span>opcional</span></label><input autoComplete="tel" id="whatsapp" inputMode="tel" maxLength={30} name="whatsapp" /></div>
      <div className="field-group"><label htmlFor="phone">Telefone <span>opcional</span></label><input autoComplete="tel" id="phone" inputMode="tel" maxLength={30} name="phone" /></div>
      <div className="field-group"><label htmlFor="email">E-mail <span>opcional</span></label><input autoComplete="email" id="email" maxLength={254} name="email" type="email" /></div>
      <div className="field-group"><label htmlFor="birthDate">Data de nascimento <span>opcional</span></label><input id="birthDate" name="birthDate" type="date" /></div>
      <div className="field-group"><label htmlFor="instagram">Instagram <span>opcional</span></label><input id="instagram" maxLength={150} name="instagram" /></div>
      <div className="field-group"><label htmlFor="source">Como conheceu o studio <span>opcional</span></label><input id="source" maxLength={250} name="source" /></div>
      <div className="field-group"><label htmlFor="city">Cidade <span>opcional</span></label><input id="city" maxLength={250} name="city" /></div>
      <div className="field-group"><label htmlFor="state">Estado <span>opcional</span></label><input id="state" maxLength={250} name="state" /></div>
    </div>
    <div className="field-group"><label htmlFor="internalNotes">Observações internas <span>opcional</span></label><textarea id="internalNotes" maxLength={4000} name="internalNotes" placeholder="Não aparece para a cliente." /></div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="button button-primary" disabled={isPending} type="submit"><Save size={18} />{isPending ? "Salvando…" : "Cadastrar cliente"}</button>
  </form>;
}
