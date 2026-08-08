"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { saveHoursAction, type SettingsFormState } from "../actions";

type Rule = { dayOfWeek: number; startsAtMinute: number; endsAtMinute: number; lunchStartsAt: number | null; lunchEndsAt: number | null; isEnabled: boolean };
const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const initialState: SettingsFormState = {};
const toTime = (value: number | null) => value === null ? "" : `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function HoursForm({ resourceId, rules }: { resourceId: string; rules: Rule[] }) {
  const [state, action, isPending] = useActionState(saveHoursAction, initialState);
  return <form action={action} className="hours-form"><input name="resourceId" type="hidden" value={resourceId} />{days.map((day, dayOfWeek) => { const rule = rules.find((item) => item.dayOfWeek === dayOfWeek); return <div className="hours-row" key={day}><label className="check-field"><input defaultChecked={rule?.isEnabled ?? false} name={`enabled-${dayOfWeek}`} type="checkbox" /><span>{day}</span></label><div><label htmlFor={`start-${dayOfWeek}`}>Início</label><input defaultValue={toTime(rule?.startsAtMinute ?? null)} id={`start-${dayOfWeek}`} name={`start-${dayOfWeek}`} type="time" /></div><div><label htmlFor={`end-${dayOfWeek}`}>Fim</label><input defaultValue={toTime(rule?.endsAtMinute ?? null)} id={`end-${dayOfWeek}`} name={`end-${dayOfWeek}`} type="time" /></div><div><label htmlFor={`lunch-start-${dayOfWeek}`}>Intervalo <span>opcional</span></label><input defaultValue={toTime(rule?.lunchStartsAt ?? null)} id={`lunch-start-${dayOfWeek}`} name={`lunch-start-${dayOfWeek}`} type="time" /></div><div><label htmlFor={`lunch-end-${dayOfWeek}`}>Fim do intervalo</label><input defaultValue={toTime(rule?.lunchEndsAt ?? null)} id={`lunch-end-${dayOfWeek}`} name={`lunch-end-${dayOfWeek}`} type="time" /></div></div>; })}{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={isPending} type="submit"><Save size={18} />{isPending ? "Salvando…" : "Salvar horários"}</button></form>;
}
