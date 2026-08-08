"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { createAppointmentAction, type AppointmentFormState } from "./actions";

type Props = { date: string; clients: { id: string; fullName: string; preferredName: string | null }[]; services: { id: string; name: string; durationMinutes: number; priceCents: number | null; promotionalPriceCents: number | null }[]; resources: { id: string; name: string }[] };
const initialState: AppointmentFormState = {};

export function AppointmentForm({ date, clients, services, resources }: Props) {
  const [state, action, isPending] = useActionState(createAppointmentAction, initialState);
  const [requestKey] = useState(() => crypto.randomUUID());

  return <form action={action} className="editor-form">
    <input name="requestKey" type="hidden" value={requestKey} />
    <div className="form-grid two-columns">
      <div className="field-group"><label htmlFor="clientId">Cliente</label><select defaultValue="" id="clientId" name="clientId" required><option disabled value="">Selecione uma cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.preferredName ?? client.fullName}</option>)}</select></div>
      <div className="field-group"><label htmlFor="serviceId">Serviço</label><select defaultValue="" id="serviceId" name="serviceId" required><option disabled value="">Selecione um serviço</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min</option>)}</select></div>
      <div className="field-group"><label htmlFor="date">Data</label><input defaultValue={date} id="date" name="date" required type="date" /></div>
      <div className="field-group"><label htmlFor="time">Horário</label><input id="time" name="time" required step="900" type="time" /></div>
      <div className="field-group"><label htmlFor="resourceId">Agenda</label><select defaultValue={resources[0]?.id ?? ""} id="resourceId" name="resourceId" required>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></div>
    </div>
    <div className="field-group"><label htmlFor="notes">Observações internas <span>opcional</span></label><textarea id="notes" maxLength={2000} name="notes" placeholder="Estas observações não aparecem para a cliente." /></div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="button button-primary" disabled={isPending} type="submit"><Save size={18} />{isPending ? "Salvando…" : "Confirmar agendamento"}</button>
  </form>;
}
