"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type InstallOutcome = "accepted" | "dismissed" | "unavailable";
type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallContextValue = {
  canInstall: boolean;
  install: () => Promise<InstallOutcome>;
  isIos: boolean;
  isStandalone: boolean;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function getStandaloneStatus() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function subscribeToStandaloneStatus(callback: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", callback);
  return () => displayMode.removeEventListener("change", callback);
}

function subscribeToNothing() {
  return () => undefined;
}

function getIosStatus() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PwaInstallProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installedInSession, setInstalledInSession] = useState(false);
  const standaloneDisplayMode = useSyncExternalStore(subscribeToStandaloneStatus, getStandaloneStatus, () => false);
  const isIos = useSyncExternalStore(subscribeToNothing, getIosStatus, () => false);
  const isStandalone = standaloneDisplayMode || installedInSession;

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPrompt);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstalledInSession(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") setInstalledInSession(true);
    return choice.outcome;
  }, [deferredPrompt]);

  const value = useMemo(() => ({
    canInstall: Boolean(deferredPrompt),
    install,
    isIos,
    isStandalone,
  }), [deferredPrompt, install, isIos, isStandalone]);

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  return context;
}
