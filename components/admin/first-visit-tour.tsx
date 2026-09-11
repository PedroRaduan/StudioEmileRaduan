"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, History, Settings2, X } from "lucide-react";
import { markTourSeenAction } from "@/app/admin/(private)/tour-actions";
import styles from "./first-visit-tour.module.css";

const steps = [
  { icon: CalendarDays, title: "Sua agenda, sem complicação.", text: "Escolha o dia e toque em um horário livre para marcar um atendimento.", hint: "Agenda → Novo agendamento" },
  { icon: History, title: "O histórico continua aqui.", text: "Abra Histórico para consultar atendimentos anteriores. Use as setas ou escolha uma data para voltar no tempo.", hint: "Agenda → Histórico" },
  { icon: Settings2, title: "Ajuste no seu ritmo.", text: "Nas Configurações, escolha a cor da agenda e seus horários de atendimento. Você pode mudar depois.", hint: "Configurações → Visual da agenda" },
];

export function FirstVisitTour({ initiallySeen, replay = false }: { initiallySeen: boolean; replay?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [closed, setClosed] = useState(initiallySeen);
  const [step, setStep] = useState(0);
  const [seenFailed, setSeenFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (closed) return;
    dialog.current?.showModal();
    void markTourSeenAction().then((result) => setSeenFailed(!result.saved)).catch(() => setSeenFailed(true));
  }, [closed]);
  useEffect(() => { if (!closed) title.current?.focus(); }, [step, closed]);
  function close() { dialog.current?.close(); setClosed(true); }
  async function retry() {
    setRetrying(true);
    try { setSeenFailed(!(await markTourSeenAction()).saved); } catch { setSeenFailed(true); }
    finally { setRetrying(false); }
  }
  if (closed) return replay ? <button className="button button-primary" type="button" onClick={() => { setStep(0); setClosed(false); }}>Ver guia rápido</button> : null;
  const current = steps[step];
  const Icon = current.icon;
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="quick-guide-title" aria-describedby="quick-guide-description" onCancel={() => setClosed(true)}>
    <header className={styles.header}><span>GUIA RÁPIDO</span><button className={styles.close} aria-label="Fechar guia" onClick={close} type="button"><X size={19} /></button></header>
    <div className={styles.content} key={step}>
      <span className={styles.icon}><Icon size={28} strokeWidth={1.6} aria-hidden="true" /></span>
      <h2 id="quick-guide-title" tabIndex={-1} ref={title}>{current.title}</h2>
      <p id="quick-guide-description">{current.text}</p>
      <div className={styles.hint}>{current.hint}</div>
    </div>
    {seenFailed ? <p className={styles.error} role="alert">Não foi possível registrar a exibição. <button disabled={retrying} onClick={retry} type="button">{retrying ? "Salvando…" : "Tentar novamente"}</button></p> : null}
    <footer className={styles.footer}>
      <button className={styles.secondary} type="button" onClick={step ? () => setStep(step - 1) : close}>{step ? <><ArrowLeft size={15} />Voltar</> : "Agora não"}</button>
      <span className={styles.progress} aria-label={`Passo ${step + 1} de ${steps.length}`}>{steps.map((item, index) => <i key={item.title} className={index === step ? styles.active : ""} />)}</span>
      <button className={styles.primary} type="button" onClick={step === steps.length - 1 ? close : () => setStep(step + 1)}>{step === steps.length - 1 ? "Entendi" : "Próximo"}<ArrowRight size={16} /></button>
    </footer>
  </dialog>;
}
