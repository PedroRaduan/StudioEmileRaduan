"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { saveHoursAction, type SettingsFormState } from "../actions";

type Rule = { dayOfWeek: number; startsAtMinute: number; endsAtMinute: number; lunchStartsAt: number | null; lunchEndsAt: number | null; isEnabled: boolean };
const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const toTime = (value: number | null) => value === null ? "" : `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function HoursForm({ resourceId, rules }: { resourceId: string; rules: Rule[] }) {
  const [state, action, pending] = useActionState(saveHoursAction, {} as SettingsFormState);
  const [values, setValues] = useState(() => days.map((_, index) => {
    const rule = rules.find((item) => item.dayOfWeek === index);
    return { enabled: rule?.isEnabled ?? false, start: toTime(rule?.startsAtMinute ?? 480), end: toTime(rule?.endsAtMinute || 1080), lunchStart: toTime(rule?.lunchStartsAt ?? null), lunchEnd: toTime(rule?.lunchEndsAt ?? null) };
  }));
  function change(index: number, patch: Partial<(typeof values)[number]>) {
    setValues((current) => current.map((value, day) => day === index ? { ...value, ...patch } : value));
  }
  return <form action={action} className="hours-form"><input name="resourceId" type="hidden" value={resourceId} />
    {days.map((day, index) => <div className="hours-row" key={day}>
      <label className="check-field"><input checked={values[index].enabled} onChange={(event) => change(index, { enabled: event.target.checked })} name={`enabled-${index}`} type="checkbox" disabled={pending} /><span>{day}</span></label>
      {([{ key: "start", name: "start", label: "Início" }, { key: "end", name: "end", label: "Fim" }, { key: "lunchStart", name: "lunch-start", label: "Intervalo (opcional)" }, { key: "lunchEnd", name: "lunch-end", label: "Fim do intervalo" }] as const).map((field) => <div key={field.key}><label htmlFor={`${field.name}-${index}`}>{field.label}</label><input id={`${field.name}-${index}`} name={`${field.name}-${index}`} type="time" value={values[index][field.key]} onChange={(event) => change(index, { [field.key]: event.target.value })} readOnly={pending} /></div>)}
    </div>)}
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}
    <button className="button button-primary" disabled={pending} type="submit"><Save size={18} />{pending ? "Salvando…" : "Salvar horários"}</button>
  </form>;
}
