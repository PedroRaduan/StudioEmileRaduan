"use client";

import { CalendarOff, Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { createBlockAction, deleteBlockAction, deleteExceptionAction, saveExceptionAction, type AvailabilityFormState } from "./actions";

const initialState: AvailabilityFormState = {};

export function BlockForm({ defaultDate, resourceId }: { defaultDate: string; resourceId: string }) {
  const [state, action, pending] = useActionState(createBlockAction, initialState);
  return <form action={action} className="editor-form"><input name="resourceId" type="hidden" value={resourceId} /><div className="form-grid two-columns"><div className="field-group"><label htmlFor="block-date">Data</label><input defaultValue={defaultDate} id="block-date" name="date" required type="date" /></div><div className="field-group"><label htmlFor="block-title">Compromisso</label><input id="block-title" maxLength={150} name="title" placeholder="Ex.: médico, almoço ou buscar filho" required /></div><div className="field-group"><label htmlFor="block-start">Início</label><input id="block-start" name="startsAt" required type="time" /></div><div className="field-group"><label htmlFor="block-end">Fim</label><input id="block-end" name="endsAt" required type="time" /></div><div className="field-group form-wide"><label htmlFor="block-note">Observação <span>opcional</span></label><input id="block-note" maxLength={500} name="note" /></div></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><CalendarOff size={17} />{pending ? "Salvando…" : "Salvar compromisso"}</button></form>;
}

export function ExceptionForm({ defaultDate, resourceId }: { defaultDate: string; resourceId: string }) {
  const [state, action, pending] = useActionState(saveExceptionAction, initialState);
  return <form action={action} className="editor-form"><input name="resourceId" type="hidden" value={resourceId} /><div className="form-grid two-columns"><div className="field-group"><label htmlFor="exception-date">Data específica</label><input defaultValue={defaultDate} id="exception-date" name="date" required type="date" /></div><label className="check-field form-toggle"><input name="isClosed" type="checkbox" /><span>Studio fechado durante todo o dia</span></label><div className="field-group"><label htmlFor="exception-start">Início especial</label><input id="exception-start" name="startsAt" type="time" /></div><div className="field-group"><label htmlFor="exception-end">Fim especial</label><input id="exception-end" name="endsAt" type="time" /></div><div className="field-group form-wide"><label htmlFor="exception-note">Motivo <span>opcional</span></label><input id="exception-note" maxLength={500} name="note" /></div></div><p className="form-hint">Se a data estiver fechada, os horários especiais serão ignorados.</p>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><Save size={17} />{pending ? "Salvando…" : "Salvar exceção"}</button></form>;
}

export function DeleteAvailabilityForm({ id, kind }: { id: string; kind: "block" | "exception" }) {
  const action = kind === "block" ? deleteBlockAction : deleteExceptionAction;
  return <form action={action} onSubmit={(event) => { if (!window.confirm("Remover esta regra de disponibilidade?")) event.preventDefault(); }}><input name="id" type="hidden" value={id} /><button aria-label="Remover" className="icon-action danger" type="submit"><Trash2 size={16} /></button></form>;
}
