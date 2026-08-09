"use client";

import { FileCheck2, KeyRound, Save, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { addClientNoteAction, createPrivacyRequestAction, prepareClientAccessAction, recordConsentAction, saveHealthProfileAction, updateClientDetailsAction, type ClientProfileState } from "./actions";
import type { SensitiveClientData } from "@/lib/security/sensitive-data";

const initialState: ClientProfileState = {};

type EditableClient = {
  id: string;
  fullName: string;
  preferredName: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  city: string | null;
  state: string | null;
};

export function ClientDetailsForm({ client }: { client: EditableClient }) {
  const [state, action, pending] = useActionState(updateClientDetailsAction, initialState);
  return <details className="client-edit-details"><summary>Editar dados da cliente</summary><form action={action} className="editor-form compact-form"><input name="clientId" type="hidden" value={client.id} /><div className="form-grid two-columns"><div className="field-group"><label htmlFor="edit-full-name">Nome completo</label><input defaultValue={client.fullName} id="edit-full-name" maxLength={150} name="fullName" required /></div><div className="field-group"><label htmlFor="edit-preferred-name">Como prefere ser chamada <span>opcional</span></label><input defaultValue={client.preferredName ?? ""} id="edit-preferred-name" maxLength={150} name="preferredName" /></div><div className="field-group"><label htmlFor="edit-whatsapp">WhatsApp <span>opcional</span></label><input autoComplete="tel" defaultValue={client.whatsapp ?? ""} id="edit-whatsapp" maxLength={30} name="whatsapp" /></div><div className="field-group"><label htmlFor="edit-phone">Telefone <span>opcional</span></label><input autoComplete="tel" defaultValue={client.phone ?? ""} id="edit-phone" maxLength={30} name="phone" /></div><div className="field-group"><label htmlFor="edit-email">E-mail <span>opcional</span></label><input autoComplete="email" defaultValue={client.email ?? ""} id="edit-email" maxLength={254} name="email" type="email" /></div><div className="field-group"><label htmlFor="edit-birth-date">Nascimento <span>opcional</span></label><input defaultValue={client.birthDate?.toISOString().slice(0, 10) ?? ""} id="edit-birth-date" name="birthDate" type="date" /></div><div className="field-group"><label htmlFor="edit-city">Cidade <span>opcional</span></label><input defaultValue={client.city ?? ""} id="edit-city" maxLength={250} name="city" /></div><div className="field-group"><label htmlFor="edit-state">Estado <span>opcional</span></label><input defaultValue={client.state ?? ""} id="edit-state" maxLength={250} name="state" /></div></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="secondary-action" disabled={pending} type="submit"><Save size={16} />{pending ? "Salvando…" : "Salvar dados"}</button></form></details>;
}

export function ClientNoteForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(addClientNoteAction, initialState);
  return <form action={action} className="editor-form compact-form"><input name="clientId" type="hidden" value={clientId} /><div className="field-group"><label htmlFor="client-note">Nova observação interna</label><textarea id="client-note" maxLength={4000} name="body" placeholder="Registre preferências ou informações úteis para o próximo atendimento." required /></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="secondary-action" disabled={pending} type="submit"><Save size={16} />{pending ? "Salvando…" : "Adicionar observação"}</button></form>;
}

export function HealthProfileForm({ clientId, initial }: { clientId: string; initial: SensitiveClientData }) {
  const [state, action, pending] = useActionState(saveHealthProfileAction, initialState);
  const fields: Array<[keyof SensitiveClientData, string, string]> = [
    ["allergies", "Alergias informadas", "Não realize diagnóstico; registre apenas o relato da cliente."], ["sensitivities", "Sensibilidades", ""], ["medications", "Medicamentos relevantes informados", ""], ["pregnancy", "Gestação", ""], ["previousProcedures", "Procedimentos anteriores", ""], ["restrictions", "Restrições", ""], ["contraindications", "Contraindicações informadas", ""], ["importantNotes", "Observações importantes", ""],
  ];
  return <form action={action} className="editor-form"><input name="clientId" type="hidden" value={clientId} /><div className="sensitive-notice"><ShieldCheck size={17} /><span>Conteúdo criptografado e visível somente para perfis autorizados.</span></div><div className="form-grid two-columns">{fields.map(([name, label, placeholder]) => <div className={`field-group ${name === "importantNotes" ? "form-wide" : ""}`} key={name}><label htmlFor={`health-${name}`}>{label} <span>opcional</span></label><textarea defaultValue={initial[name]} id={`health-${name}`} maxLength={name === "importantNotes" ? 2000 : 1500} name={name} placeholder={placeholder} /></div>)}</div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><Save size={17} />{pending ? "Protegendo…" : "Salvar informações protegidas"}</button></form>;
}

export function ConsentForm({ clientId, documents }: { clientId: string; documents: Array<{ id: string; title: string; version: string }> }) {
  const [state, action, pending] = useActionState(recordConsentAction, initialState);
  if (!documents.length) return <div className="empty-state"><p>Nenhum termo ativo.</p><span>Cadastre e publique um documento nas configurações antes de registrar o aceite.</span></div>;
  return <form action={action} className="editor-form compact-form"><input name="clientId" type="hidden" value={clientId} /><div className="field-group"><label htmlFor="consent-document">Documento aceito</label><select id="consent-document" name="documentId" required>{documents.map((document) => <option key={document.id} value={document.id}>{document.title} · versão {document.version}</option>)}</select></div><div className="field-group"><label htmlFor="consent-granted">Decisão registrada</label><select id="consent-granted" name="granted"><option value="true">Aceitou</option><option value="false">Não aceitou</option></select></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="secondary-action" disabled={pending} type="submit"><FileCheck2 size={16} />{pending ? "Registrando…" : "Registrar decisão"}</button></form>;
}

export function PrivacyRequestForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createPrivacyRequestAction, initialState);
  return <form action={action} className="editor-form compact-form"><input name="clientId" type="hidden" value={clientId} /><div className="field-group"><label htmlFor="privacy-type">Tipo de solicitação</label><select id="privacy-type" name="type"><option value="CORRECTION">Correção de dados</option><option value="EXPORT">Exportação dos dados</option><option value="DELETION">Exclusão dos dados</option></select></div><div className="field-group"><label htmlFor="privacy-note">Detalhes <span>opcional</span></label><textarea id="privacy-note" maxLength={1000} name="note" /></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="secondary-action" disabled={pending} type="submit"><ShieldCheck size={16} />{pending ? "Registrando…" : "Registrar solicitação LGPD"}</button></form>;
}

export function ClientAccessForm({ clientId, hasAccount, hasOpenRequest, whatsapp }: { clientId: string; hasAccount: boolean; hasOpenRequest: boolean; whatsapp: string | null }) {
  const [state, action, pending] = useActionState(prepareClientAccessAction, initialState);
  const whatsappUrl = whatsapp && state.link ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Este é seu link seguro para definir uma nova senha. Ele expira em 2 horas e funciona uma única vez: ${state.link}`)}` : null;
  return <form action={action} className="editor-form compact-form"><input name="clientId" type="hidden" value={clientId} /><p className="muted-copy">{hasOpenRequest ? "A cliente solicitou ajuda para recuperar o acesso." : hasAccount ? "Gere um link temporário para redefinir a senha." : "Crie o acesso e envie um link para a cliente definir a própria senha."}</p>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}{state.link ? <div className="access-link-result"><label htmlFor="access-link">Link temporário</label><input id="access-link" readOnly value={state.link} /><div className="access-link-actions"><a className="secondary-action" href={state.link} rel="noreferrer" target="_blank">Abrir link</a>{whatsappUrl ? <a className="secondary-action" href={whatsappUrl} rel="noreferrer" target="_blank">Enviar pelo WhatsApp</a> : null}</div></div> : null}<button className="secondary-action" disabled={pending} type="submit"><KeyRound size={16} />{pending ? "Gerando…" : hasAccount ? "Gerar link de redefinição" : "Criar acesso seguro"}</button></form>;
}
