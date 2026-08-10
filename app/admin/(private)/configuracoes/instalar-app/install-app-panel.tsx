"use client";

import { CheckCircle2, Download, LoaderCircle, MonitorDown, Share2 } from "lucide-react";
import { useState } from "react";
import { usePwaInstall } from "@/components/pwa-install";

export function InstallAppPanel() {
  const { canInstall, install, isIos, isStandalone } = usePwaInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (isStandalone) {
    return <div className="pwa-install-status"><CheckCircle2 aria-hidden="true" /><div><strong>O aplicativo já está instalado.</strong><p>Você já pode abrir a agenda pela tela inicial ou pelos aplicativos deste dispositivo.</p></div></div>;
  }

  const onInstall = async () => {
    setIsInstalling(true);
    setMessage(null);
    try {
      const outcome = await install();
      if (outcome === "dismissed") setMessage("A instalação foi cancelada. Você pode tentar novamente quando quiser.");
      if (outcome === "unavailable") setMessage("A instalação ainda não está disponível neste navegador. Atualize a página ou abra pelo Chrome, Edge ou Safari.");
    } finally {
      setIsInstalling(false);
    }
  };

  if (isIos) {
    return <div className="pwa-install-status"><Share2 aria-hidden="true" /><div><strong>Instale pelo menu do Safari.</strong><p>Toque em Compartilhar e escolha <b>Adicionar à Tela de Início</b>. Depois confirme para criar o atalho do aplicativo.</p></div></div>;
  }

  return <div className="pwa-install-panel"><p className="muted-copy">O aplicativo abre em uma janela própria e mantém seus dados protegidos dentro da sua sessão.</p>{canInstall ? <button className="button pwa-install-button" disabled={isInstalling} onClick={onInstall} type="button">{isInstalling ? <LoaderCircle aria-hidden="true" className="spin" size={17} /> : <Download aria-hidden="true" size={17} />}{isInstalling ? "Abrindo instalação..." : "Instalar aplicativo"}</button> : <div className="pwa-install-status"><MonitorDown aria-hidden="true" /><div><strong>Preparando a instalação.</strong><p>Se o botão não aparecer, atualize esta página e use uma versão recente do Chrome ou Edge em conexão segura.</p></div></div>}{message ? <p className="form-success" role="status">{message}</p> : null}</div>;
}
