"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const DISMISSED_KEY = "admin-pwa-install-dismissed";

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredInstallPrompt | null>(null);
  const [hidden, setHidden] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = window.localStorage.getItem(DISMISSED_KEY) === "true";
    const timer = window.setTimeout(() => { setHidden(dismissed || Boolean(standalone)); setIos(isIos && !standalone); }, 0);
    const listener = (event: Event) => { event.preventDefault(); setDeferred(event as DeferredInstallPrompt); };
    const installed = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", listener);
    window.addEventListener("appinstalled", installed);
    return () => { window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", listener); window.removeEventListener("appinstalled", installed); };
  }, []);

  if (hidden || (!deferred && !ios)) return null;

  const dismiss = () => { window.localStorage.setItem(DISMISSED_KEY, "true"); setHidden(true); };
  return <aside className="install-prompt" aria-label="Instalar agenda"><Download aria-hidden="true" size={18} /><div><strong>Instalar agenda</strong><span>{ios ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início." : "Abra a administração como um aplicativo no celular."}</span></div>{deferred ? <button onClick={async () => { await deferred.prompt(); const choice = await deferred.userChoice; if (choice.outcome === "accepted") setHidden(true); else dismiss(); }} type="button">Instalar</button> : null}<button aria-label="Fechar aviso de instalação" className="close-install" onClick={dismiss} type="button"><X aria-hidden="true" size={16} /></button></aside>;
}
