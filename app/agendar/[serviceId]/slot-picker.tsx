"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { startBookingHoldAction, type BookingState } from "../actions";

export function SlotPicker({ serviceId, date, slots }: { serviceId: string; date: string; slots: { time: string }[] }) {
  const [selected, setSelected] = useState("");
  const [state, action, pending] = useActionState(startBookingHoldAction, {} as BookingState);
  return <form action={action} className="slot-form"><input name="serviceId" type="hidden" value={serviceId} /><input name="date" type="hidden" value={date} /><fieldset><legend>Horários disponíveis</legend>{slots.length ? <div className="slot-grid">{slots.map((slot) => <label className={selected === slot.time ? "selected" : ""} key={slot.time}><input checked={selected === slot.time} name="time" onChange={() => setSelected(slot.time)} required type="radio" value={slot.time} /><span>{slot.time}</span></label>)}</div> : <div className="no-slots"><strong>Sem horários disponíveis nesta data.</strong><span>Escolha outro dia para continuar.</span></div>}</fieldset>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button button-primary slot-continue" disabled={!selected || pending} type="submit">{pending ? "Reservando…" : "Continuar"}<ArrowRight size={18} /></button></form>;
}
