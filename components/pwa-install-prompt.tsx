"use client";

import { Download, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { usePwaInstall } from "@/components/pwa-install";

const DISMISSED_KEY = "admin-pwa-install-dismissed";

function subscribeToNothing() {
  return () => undefined;
}

function getDismissedStatus() {
  return window.localStorage.getItem(DISMISSED_KEY) === "true";
}

export function PwaInstallPrompt() {
  const [dismissedInSession, setDismissedInSession] = useState(false);
  const dismissedPreviously = useSyncExternalStore(subscribeToNothing, getDismissedStatus, () => false);
  const { canInstall, install, isIos, isStandalone } = usePwaInstall();

  if (dismissedInSession || dismissedPreviously || isStandalone || (!canInstall && !isIos)) return null;

  const dismiss = () => { window.localStorage.setItem(DISMISSED_KEY, "true"); setDismissedInSession(true); };
  return <aside className="install-prompt" aria-label="Instalar agenda"><Download aria-hidden="true" size={18} /><div><strong>Instalar agenda</strong><span>{isIos ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início." : "Abra a administração como um aplicativo no celular."}</span></div>{canInstall ? <button onClick={async () => { const outcome = await install(); if (outcome !== "dismissed") setDismissedInSession(true); }} type="button">Instalar</button> : null}<button aria-label="Fechar aviso de instalação" className="close-install" onClick={dismiss} type="button"><X aria-hidden="true" size={16} /></button></aside>;
}
