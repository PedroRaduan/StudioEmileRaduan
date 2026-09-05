"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, MousePointer2, X } from "lucide-react";
import { markTourSeenAction } from "@/app/admin/(private)/tour-actions";

const steps = [
  { title: "Sua agenda começa aqui.", description: "Um lugar para os horários, os clientes e os serviços. Experimente a demonstração: nada será salvo na sua agenda." },
  { title: "Toque em um horário livre.", description: "Na Agenda, toque na grade para abrir um novo atendimento. O dia e o horário já ficam preenchidos." },
  { title: "Tudo pronto para organizar o dia.", description: "Cadastre seus serviços em Serviços e defina o expediente em Configurações → Horários semanais. Depois, é só agendar." },
];

export function FirstVisitTour({ initiallySeen }: { initiallySeen: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [closed, setClosed] = useState(initiallySeen);
  const title = useRef<HTMLHeadingElement>(null);

  async function saveSeen() {
    setRetrying(true);
    try { setSaveFailed(!(await markTourSeenAction()).saved); }
    catch { setSaveFailed(true); }
    finally { setRetrying(false); }
  }

  useEffect(() => {
    if (initiallySeen) return;
    dialog.current?.showModal();
    // Mark on first presentation, including skipping or closing the guide.
    void markTourSeenAction().then((result) => setSaveFailed(!result.saved)).catch(() => setSaveFailed(true));
  }, [initiallySeen]);

  useEffect(() => { if (step > 0) title.current?.focus(); }, [step]);

  function close() { dialog.current?.close(); setClosed(true); }
  if (closed) return null;
  return <dialog ref={dialog} className="welcome-tour" aria-labelledby="tour-title" onCancel={() => setClosed(true)}>
    <button className="tour-close" type="button" onClick={close} aria-label="Fechar tutorial"><X size={20} /></button>
    <p className="eyebrow">Conheça sua agenda · {step + 1} de {steps.length}</p>
    <div className="tour-dots" aria-hidden="true">{steps.map((item, index) => <span className={index <= step ? "active" : ""} key={item.title} />)}</div>
    <div className="tour-illustration">
      {step === 1 ? <><span className="demo-caption"><MousePointer2 size={15} /> Demonstração · toque no horário</span><button className={selected ? "tour-slot selected" : "tour-slot"} type="button" onClick={() => setSelected(true)}><time>10:00</time><span>{selected ? "Horário selecionado" : "Horário livre"}</span>{selected ? <Check size={18} /> : <ArrowRight size={18} />}</button><p role="status">{selected ? "É assim que começa um novo agendamento." : "Nenhum atendimento real será criado."}</p></> : <><CalendarDays size={42} strokeWidth={1.5} /><span>{step === 0 ? "Menos passos. Mais tempo." : "Sua rotina, no seu ritmo."}</span></>}
    </div>
    <h2 id="tour-title" ref={title} tabIndex={-1}>{steps[step].title}</h2>
    <p>{steps[step].description}</p>
    {saveFailed ? <p className="form-error" role="alert">Não conseguimos salvar que você já viu o tutorial. <button type="button" disabled={retrying} onClick={saveSeen}>{retrying ? "Salvando…" : "Tentar novamente"}</button></p> : null}
    <div className="tour-footer"><button className="button button-quiet" type="button" onClick={step ? () => setStep(step - 1) : close}>{step ? "Voltar" : "Pular tutorial"}</button><button className="button button-primary" type="button" onClick={step === steps.length - 1 ? close : () => setStep(step + 1)}>{step === steps.length - 1 ? "Começar a usar" : "Continuar"}<ArrowRight size={16} /></button></div>
  </dialog>;
}
