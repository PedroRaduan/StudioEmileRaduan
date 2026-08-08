"use client";

import { MessageSquarePlus } from "lucide-react";
import { useActionState } from "react";
import { createMessageTemplateAction, toggleMessageTemplateAction, type TemplateFormState } from "./actions";

const initialState: TemplateFormState = {};
export function TemplateForm() {
  const [state, action, pending] = useActionState(createMessageTemplateAction, initialState);
  return <form action={action} className="editor-form"><div className="form-grid two-columns"><div className="field-group"><label htmlFor="template-name">Nome do modelo</label><input id="template-name" maxLength={150} name="name" placeholder="Ex.: Confirmação de agendamento" required /></div><div className="field-group"><label htmlFor="template-channel">Canal</label><select id="template-channel" name="channel"><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option><option value="PUSH">Notificação no aplicativo</option></select></div><div className="field-group form-wide"><label htmlFor="template-body">Mensagem</label><textarea className="document-body-input" id="template-body" maxLength={4000} name="body" placeholder="Olá, {nome}. Seu horário para {servico} está marcado para {data}, às {horario}." required /></div></div><p className="form-hint">Variáveis disponíveis: {"{nome}"}, {"{servico}"}, {"{data}"}, {"{horario}"}, {"{studio}"}.</p>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><MessageSquarePlus size={17} />{pending ? "Salvando…" : "Criar modelo"}</button></form>;
}

export function TemplateStatusForm({ active, id }: { active: boolean; id: string }) { return <form action={toggleMessageTemplateAction}><input name="id" type="hidden" value={id} /><button className="secondary-action" type="submit">{active ? "Desativar" : "Ativar"}</button></form>; }

