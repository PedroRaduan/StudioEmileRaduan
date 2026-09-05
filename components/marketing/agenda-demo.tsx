"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";

const days = [
  { day: "Segunda-feira", date: "12 de agosto", first: "Design de sobrancelhas", second: "Extensão de cílios" },
  { day: "Terça-feira", date: "13 de agosto", first: "Corte e finalização", second: "Manicure" },
  { day: "Quarta-feira", date: "14 de agosto", first: "Limpeza de pele", second: "Design de sobrancelhas" },
];

export function AgendaDemo() {
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState(false);
  const current = days[day];
  function changeDay(direction: number) { setDay((day + direction + days.length) % days.length); setSelected(false); }
  return <div className="dashboard-preview interactive-preview" aria-label="Demonstração interativa da agenda">
    <div className="preview-top"><span><CalendarDays size={15} /> {current.day}</span><span className="demo-badge">Demonstração</span></div>
    <div className="preview-grid"><aside aria-hidden="true"><span className="preview-logo">a.</span><span className="active" /><span /><span /><span /></aside><section>
      <div className="preview-title"><strong>Agenda</strong><div className="preview-day-picker"><button type="button" aria-label="Dia anterior da demonstração" onClick={() => changeDay(-1)}><ChevronLeft size={18} /></button><span>{current.date}</span><button type="button" aria-label="Próximo dia da demonstração" onClick={() => changeDay(1)}><ChevronRight size={18} /></button></div></div>
      <div className="preview-appointments" key={day}><span>09:00</span><article><b>{current.first}</b><small>Cliente de exemplo · 50 min</small></article><span>10:00</span><button className="preview-free-slot" type="button" aria-pressed={selected} onClick={() => setSelected(!selected)}>{selected ? <Check size={17} /> : <Plus size={17} />}<span><b>{selected ? "Horário selecionado" : "Horário livre"}</b><small>{selected ? "Sem criar agendamento real" : "Toque para experimentar"}</small></span></button><span>11:00</span><article className="dark"><b>{current.second}</b><small>Cliente de exemplo · 1h 30</small></article></div>
      <p className="preview-hint" role="status">{selected ? "Na sua agenda, o próximo passo é escolher cliente e serviço." : "Experimente trocar o dia ou selecionar um horário."}</p>
    </section></div>
  </div>;
}
