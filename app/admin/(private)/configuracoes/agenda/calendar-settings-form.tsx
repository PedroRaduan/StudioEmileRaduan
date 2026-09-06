"use client";

import { useActionState } from "react";
import { Check, Save } from "lucide-react";
import { saveCalendarGridAction, type SettingsFormState } from "../actions";
import { AGENDA_COLORS, agendaColor } from "@/lib/agenda/colors";

const options = [
  { value: 5, preview: ["08:00", "08:05", "08:10"], description: "Maior precisão visual" },
  { value: 10, preview: ["08:00", "08:10", "08:20"], description: "Recomendado para o dia a dia" },
  { value: 15, preview: ["08:00", "08:15", "08:30"], description: "Grade mais espaçada" },
  { value: 30, preview: ["08:00", "08:30", "09:00"], description: "Visão mais compacta" },
] as const;

const initialState: SettingsFormState = {};

export function CalendarSettingsForm({ interval, primaryColor }: { interval: number; primaryColor?: string }) {
  const [state, action, isPending] = useActionState(saveCalendarGridAction, initialState);

  return (
    <form action={action} className="calendar-settings-form">
      <fieldset><legend>Cor principal</legend><p>A cor será usada na agenda deste negócio, em todos os dispositivos.</p><div className="agenda-color-options">{AGENDA_COLORS.map((color) => <label key={color.value}><input type="radio" name="primaryColor" value={color.value} defaultChecked={agendaColor(primaryColor).value === color.value} /><span aria-hidden="true" style={{ background: color.value }} />{color.name}</label>)}</div></fieldset>
      <fieldset>
        <legend>Intervalo da grade da agenda</legend>
        <p>Essa escolha altera somente as linhas de referência. A duração real de cada serviço continua definindo o tamanho do atendimento.</p>
        <div className="calendar-interval-options">
          {options.map((option) => (
            <label key={option.value}>
              <input defaultChecked={interval === option.value} name="calendarSlotInterval" type="radio" value={option.value} />
              <span className="calendar-interval-check"><Check aria-hidden="true" size={15} /></span>
              <strong>{option.value} minutos</strong>
              <small>{option.description}</small>
              <em>{option.preview.join("  ·  ")}</em>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
      <button className="button button-primary" disabled={isPending} type="submit"><Save aria-hidden="true" size={18} />{isPending ? "Salvando…" : "Salvar visual"}</button>
    </form>
  );
}
