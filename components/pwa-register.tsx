"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadRequested = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;
    let updateTimer: number | undefined;
    const onControllerChange = () => {
      if (!reloadRequested.current) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      // Remove apenas a versão antiga, que tinha escopo público. Nenhum outro
      // service worker ou cache da origem é tocado.
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations
        .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js"))
        .map((registration) => registration.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("emile-raduan-shell-")).map((key) => caches.delete(key)));
      }

      const registration = await navigator.serviceWorker.register("/admin-sw.js", {
        scope: "/admin/",
        updateViaCache: "none",
      });
      if (!active) return;

      if (registration.waiting && navigator.serviceWorker.controller) setWaitingWorker(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) setWaitingWorker(installing);
        });
      });
      updateTimer = window.setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
    };

    register().catch(() => undefined);
    return () => {
      active = false;
      if (updateTimer) window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <aside aria-live="polite" className="pwa-update" role="status">
      <RefreshCw aria-hidden="true" size={18} />
      <div><strong>Atualização disponível</strong><span>Atualize quando terminar o que está preenchendo.</span></div>
      <button onClick={() => { reloadRequested.current = true; waitingWorker.postMessage({ type: "SKIP_WAITING" }); }} type="button">Atualizar</button>
    </aside>
  );
}
