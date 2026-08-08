"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // O aplicativo continua utilizável mesmo quando o cache não puder ser ativado.
    });
    let refreshed = false;
    const refreshForNewWorker = () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", refreshForNewWorker);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", refreshForNewWorker);
  }, []);

  return null;
}
