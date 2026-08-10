"use client";

import { type ReactNode, useActionState, useState } from "react";
import { Save } from "lucide-react";
import Link from "next/link";
import { createAppointmentAction, type AppointmentFormState } from "./actions";

type Props = { date: string; minDate: string; time: string; selectedClientId?: string; selectedResourceId?: string; clients: { id: string; fullName: string; preferredName: string | null }[]; services: { id: string; name: string; durationMinutes: number; priceCents: number | null; promotionalPriceCents: number | null }[]; resources: { id: string; name: string }[] };
const initialState: AppointmentFormState = {};

export function AppointmentForm({ date, minDate, time, selectedClientId, selectedResourceId, clients, services, resources }: Props) {
  const [state, action, isPending] = useActionState(createAppointmentAction, initialState);
  const [requestKey] = useState(() => crypto.randomUUID());

  return <form action={action} className="editor-form">
    <input name="requestKey" type="hidden" value={requestKey} />
    <div className="form-grid two-columns">
      <FieldError error={state.fieldErrors?.clientId}><div className="field-label-row"><label htmlFor="clientId">Cliente</label><Link href="/admin/clientes/novo">Cadastrar nova</Link></div><select aria-invalid={Boolean(state.fieldErrors?.clientId)} defaultValue={clients.some((client) => client.id === selectedClientId) ? selectedClientId : ""} id="clientId" name="clientId" required><option disabled value="">Selecione uma cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.preferredName ?? client.fullName}</option>)}</select></FieldError>
      <FieldError error={state.fieldErrors?.serviceId}><label htmlFor="serviceId">Serviço</label><select aria-invalid={Boolean(state.fieldErrors?.serviceId)} defaultValue="" id="serviceId" name="serviceId" required><option disabled value="">Selecione um serviço</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min</option>)}</select></FieldError>
      <FieldError error={state.fieldErrors?.date}><label htmlFor="date">Data</label><input aria-invalid={Boolean(state.fieldErrors?.date)} defaultValue={date} id="date" min={minDate} name="date" required type="date" /></FieldError>
      <FieldError error={state.fieldErrors?.time}><label htmlFor="time">Horário</label><input aria-invalid={Boolean(state.fieldErrors?.time)} defaultValue={time} id="time" name="time" required step="300" type="time" /></FieldError>
      <FieldError error={state.fieldErrors?.resourceId}><label htmlFor="resourceId">Agenda</label><select aria-invalid={Boolean(state.fieldErrors?.resourceId)} defaultValue={resources.some((resource) => resource.id === selectedResourceId) ? selectedResourceId : resources[0]?.id ?? ""} id="resourceId" name="resourceId" required>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></FieldError>
    </div>
    <div className="field-group"><label htmlFor="notes">Observações internas <span>opcional</span></label><textarea id="notes" maxLength={2000} name="notes" placeholder="Estas observações não aparecem para a cliente." /></div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="button button-primary appointment-submit" disabled={isPending} type="submit"><Save aria-hidden="true" size={18} />{isPending ? "Salvando…" : "Confirmar agendamento"}</button>
  </form>;
}

function FieldError({ children, error }: { children: ReactNode; error?: string }) {
  return <div className="field-group">{children}{error ? <span className="field-error" role="alert">{error}</span> : null}</div>;
}
