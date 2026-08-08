"use client";

import { FilePlus2 } from "lucide-react";
import { useActionState } from "react";
import { createDocumentAction, deactivateDocumentAction, type DocumentFormState } from "./actions";

const initialState: DocumentFormState = {};
export function DocumentForm() {
  const [state, action, pending] = useActionState(createDocumentAction, initialState);
  return <form action={action} className="editor-form"><div className="form-grid two-columns"><div className="field-group"><label htmlFor="document-type">Tipo</label><select id="document-type" name="type"><option value="PRIVACY">Privacidade e dados</option><option value="COMMUNICATION">Comunicações</option><option value="PHOTO">Uso de fotos</option><option value="PROCEDURE">Procedimento</option></select></div><div className="field-group"><label htmlFor="document-version">Versão</label><input id="document-version" maxLength={30} name="version" placeholder="Ex.: 1.0" required /></div><div className="field-group form-wide"><label htmlFor="document-title">Título</label><input id="document-title" maxLength={180} name="title" required /></div><div className="field-group form-wide"><label htmlFor="document-body">Texto completo</label><textarea className="document-body-input" id="document-body" maxLength={30000} name="body" placeholder="Escreva o texto que será apresentado e aceito pela cliente." required /></div></div><p className="form-hint">Ao publicar uma nova versão do mesmo tipo, a anterior deixa de ser oferecida para novos aceites, mas seu histórico permanece preservado.</p>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><FilePlus2 size={17} />{pending ? "Publicando…" : "Publicar nova versão"}</button></form>;
}

export function DeactivateDocumentForm({ id }: { id: string }) {
  return <form action={deactivateDocumentAction} onSubmit={(event) => { if (!window.confirm("Desativar este documento para novos aceites?")) event.preventDefault(); }}><input name="id" type="hidden" value={id} /><button className="secondary-action" type="submit">Desativar</button></form>;
}

