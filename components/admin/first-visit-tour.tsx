"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, CalendarDays, Check, Play, RotateCcw, X } from "lucide-react";
import { markTourSeenAction, saveTourPersonalizationAction } from "@/app/admin/(private)/tour-actions";
import { AGENDA_COLORS, agendaColor } from "@/lib/agenda/colors";
import { calendarSlotInterval, timeFromMinute } from "@/lib/agenda/timeline";
import { demoNextStatus, type DemoStatus } from "@/lib/admin/tour-personalization";

const steps = ["A cara do seu negócio", "Sua forma de organizar", "Experimente um dia", "Tudo do seu jeito"];
type Props = { initiallySeen: boolean; studioName?: string; primaryColor?: string; interval?: number; mayCustomize?: boolean; replay?: boolean };

export function FirstVisitTour({ initiallySeen, studioName = "Meu negócio", primaryColor, interval, mayCustomize = false, replay = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [closed, setClosed] = useState(initiallySeen);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(studioName);
  const [color, setColor] = useState(agendaColor(primaryColor).value);
  const [grid, setGrid] = useState(calendarSlotInterval(interval));
  const [status, setStatus] = useState<DemoStatus>("free");
  const [hour, setHour] = useState(600);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [seenFailed, setSeenFailed] = useState(false);
  const preset = agendaColor(color);

  useEffect(() => {
    if (closed) return;
    dialog.current?.showModal();
    void markTourSeenAction().then((result) => setSeenFailed(!result.saved)).catch(() => setSeenFailed(true));
  }, [closed]);
  useEffect(() => { if (!closed) title.current?.focus(); }, [step, closed]);

  function close() { if (busy) return; dialog.current?.close(); setClosed(true); }
  function simulate(action: Parameters<typeof demoNextStatus>[1]) { setStatus((current) => demoNextStatus(current, action)); }
  async function save() {
    setBusy(true); setError("");
    try {
      const result = await saveTourPersonalizationAction({ studioName: name, primaryColor: color, calendarSlotInterval: grid });
      setSaved(result.saved); if (!result.saved) setError(result.error ?? "Não foi possível salvar.");
    } catch { setError("Não foi possível salvar. Verifique sua conexão e permissão."); }
    finally { setBusy(false); }
  }
  if (closed) return replay ? <button className="button button-primary" onClick={() => { setStep(0); setSaved(false); setClosed(false); }} type="button"><Play size={17} />Abrir tutorial interativo</button> : null;

  return <dialog ref={dialog} className="welcome-tour shop-tour" style={{ "--rose": color, "--rose-soft": preset.soft } as CSSProperties} aria-labelledby="tour-title" onCancel={(event) => { if (busy) event.preventDefault(); else setClosed(true); }}>
    <button className="tour-close" disabled={busy} type="button" onClick={close} aria-label="Fechar tutorial sem salvar alterações"><X size={20} /></button>
    <p className="eyebrow">Seu espaço, do seu jeito · {step + 1} de {steps.length}</p>
    <div className="tour-dots" aria-hidden="true">{steps.map((item, index) => <span className={index <= step ? "active" : ""} key={item} />)}</div>
    <div className="shop-tour-stage" key={step}>
      <h2 id="tour-title" ref={title} tabIndex={-1}>{steps[step]}</h2>
      <p className="tour-intro">{step === 0 ? "Escolha o nome e experimente as cores. A prévia muda na hora." : step === 1 ? "Veja como o intervalo muda a leitura da agenda, sem alterar a duração dos serviços." : step === 2 ? "Toque no horário livre, confirme a chegada e conclua um atendimento de exemplo." : "Confira suas escolhas. Só o nome de exibição, a cor e a grade serão salvos."}</p>
      <div className="shop-tour-grid">
        <section className="tour-workbench" aria-label="Escolhas e simulação">
          {step === 0 ? <><label className="field-group">Nome de exibição<input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} maxLength={100} /></label><fieldset className="tour-color-field"><legend>Paleta do negócio</legend><div className="agenda-color-options">{AGENDA_COLORS.map((item) => <label key={item.value}><input type="radio" name="tourColor" checked={color === item.value} onChange={() => { setColor(item.value); setSaved(false); }} /><span style={{ background: item.value }} aria-hidden="true" />{item.name}</label>)}</div></fieldset></> : null}
          {step === 1 ? <><fieldset className="tour-color-field"><legend>Intervalo entre as linhas</legend><div className="tour-grid-options">{([5, 10, 15, 30] as const).map((value) => <button aria-pressed={grid === value} key={value} type="button" onClick={() => { setGrid(value); setSaved(false); setStatus("free"); setHour(600); }}>{value} min{grid === value ? <Check size={15} /> : null}</button>)}</div></fieldset><p>Role a prévia ao lado para explorar os horários. Na agenda real, você terá acesso ao dia inteiro desde 00:00.</p></> : null}
          {step === 2 ? <><p className="demo-caption">Simulação local · dados de exemplo</p><div className="tour-sim-actions">{status === "free" || status === "cancelled" ? <p>Escolha o horário livre na prévia para começar.</p> : null}{status === "scheduled" ? <button type="button" className="button button-primary" onClick={() => simulate("confirm")}>Confirmar atendimento</button> : null}{status === "confirmed" ? <button type="button" className="button button-primary" onClick={() => simulate("complete")}>Concluir atendimento</button> : null}{status === "scheduled" || status === "confirmed" ? <><button className="secondary-action" type="button" onClick={() => setHour((value) => value === 600 ? 660 : 600)}>Reagendar para {hour === 600 ? "11:00" : "10:00"}</button><button className="button button-quiet" type="button" onClick={() => simulate("cancel")}>Simular cancelamento</button></> : null}<button className="secondary-action" type="button" onClick={() => { simulate("reset"); setHour(600); }}><RotateCcw size={15} />Recomeçar simulação</button></div><p>Nenhuma cliente, cobrança ou movimentação de estoque será criada.</p></> : null}
          {step === 3 ? <><dl className="detail-list"><div><dt>Nome de exibição</dt><dd>{name || "Meu negócio"}</dd></div><div><dt>Cor</dt><dd>{preset.name}</dd></div><div><dt>Grade</dt><dd>{grid} minutos</dd></div></dl><p>Serviços, horários de funcionamento e dados já existentes não serão alterados.</p>{mayCustomize ? <button className="button button-primary" type="button" disabled={busy || saved || name.trim().length < 2} onClick={save}>{busy ? "Salvando…" : saved ? "Personalização salva" : "Aplicar ao meu negócio"}</button> : <p>Você pode explorar livremente. Somente o proprietário pode aplicar a personalização do negócio.</p>}{error ? <p className="form-error" role="alert">{error}</p> : null}{saved ? <p className="form-success" role="status">Pronto! A identidade da sua agenda foi atualizada.</p> : null}</> : null}
        </section>
        <section className="tour-live-preview" aria-label="Prévia demonstrativa da agenda">
          <header><span className="tour-monogram">{(name.trim() || "M").slice(0, 1).toUpperCase()}</span><div><strong>{name || "Meu negócio"}</strong><small>Prévia · não é sua agenda real</small></div><CalendarDays size={20} /></header>
          <div className="tour-preview-day"><strong>Um dia no seu negócio</strong><span>{grid} min</span></div>
          <div className="tour-preview-scroll" tabIndex={0} aria-label="Horários de demonstração, área rolável">
            {Array.from({ length: 120 / grid }, (_, index) => 600 + index * grid).map((minute) => {
              const occupied = status !== "free" && status !== "cancelled" && minute >= hour && minute < hour + 30;
              return <div className="tour-preview-row" key={minute}><time>{timeFromMinute(minute)}</time>{occupied ? minute === hour ? <div className={`tour-demo-booking demo-${status}`}><strong>Cliente de exemplo</strong><small>Atendimento · 30 min</small><span>{status === "scheduled" ? "Agendado" : status === "confirmed" ? "Confirmado" : "Concluído"}</span></div> : <span className="tour-preview-continuation" /> : <button disabled={step !== 2 || (status !== "free" && status !== "cancelled") || minute > 690} type="button" onClick={() => { setHour(minute); simulate("book"); }} aria-label={`Simular agendamento às ${timeFromMinute(minute)}`}>{minute % 30 === 0 ? "Horário livre" : "·"}</button>}</div>;
            })}
          </div>
          <div className="tour-sim-result" role="status">{status === "completed" ? "✓ Atendimento concluído na simulação. Na rotina real, acompanhe pagamentos no Financeiro." : status === "cancelled" ? "Cancelado na simulação. O horário está livre novamente." : status === "confirmed" ? "Confirmação registrada apenas na demonstração." : status === "scheduled" ? "Horário reservado na demonstração. Agora confirme o atendimento." : "Experimente sem alterar dados reais."}</div>
        </section>
      </div>
    </div>
    {seenFailed ? <p className="form-error" role="alert">Não foi possível registrar a exibição. O tutorial poderá aparecer novamente. <button type="button" onClick={() => void markTourSeenAction().then((result) => setSeenFailed(!result.saved)).catch(() => setSeenFailed(true))}>Tentar novamente</button></p> : null}
    <p className="tour-save-note">{saved ? "Preferências salvas." : "As escolhas são apenas uma prévia até você clicar em Aplicar."} Você pode reabrir este guia nas Configurações.</p>
    <div className="tour-footer"><button className="button button-quiet" disabled={busy} type="button" onClick={step ? () => setStep(step - 1) : close}>{step ? "Voltar" : "Explorar depois"}</button><button className="button button-primary" disabled={busy} type="button" onClick={step === steps.length - 1 ? close : () => setStep(step + 1)}>{step === steps.length - 1 ? saved ? "Começar a usar" : "Fechar sem aplicar" : "Continuar"}<ArrowRight size={16} /></button></div>
  </dialog>;
}
