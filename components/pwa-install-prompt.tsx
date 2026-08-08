"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredInstallPrompt | null>(null);
  const [hidden, setHidden] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const timer = window.setTimeout(() => setIos(isIos && !standalone), 0);
    const listener = (event: Event) => { event.preventDefault(); setDeferred(event as DeferredInstallPrompt); };
    window.addEventListener("beforeinstallprompt", listener);
    return () => { window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", listener); };
  }, []);

  if (hidden || (!deferred && !ios)) return null;

  return <aside className="install-prompt" aria-label="Instalar agenda"><Download size={18} /><div><strong>Instalar agenda</strong><span>{ios ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início." : "Acesse sua agenda como um aplicativo no celular."}</span></div>{deferred ? <button onClick={async () => { await deferred.prompt(); const choice = await deferred.userChoice; if (choice.outcome === "accepted") setHidden(true); }} type="button">Instalar</button> : null}<button aria-label="Fechar aviso" className="close-install" onClick={() => setHidden(true)} type="button"><X size={16} /></button></aside>;
}
