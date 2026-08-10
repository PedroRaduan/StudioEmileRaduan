"use client";

import { useEffect } from "react";

const LEGACY_CACHE_PREFIX = "emile-raduan-shell-";
const RELOAD_KEY = "agenda-legacy-service-worker-cleanup";

function isLegacyPublicWorker(registration: ServiceWorkerRegistration) {
  const worker = registration.active ?? registration.waiting ?? registration.installing;
  if (!worker) return false;

  return new URL(worker.scriptURL).pathname === "/sw.js";
}

/**
 * A versão anterior registrava um service worker para todo o domínio. Ele
 * podia manter arquivos estáticos antigos, inclusive a folha de estilos da
 * landing. O PWA atual é limitado a /admin; esta limpeza é propositalmente
 * restrita ao worker e ao cache antigos deste produto.
 */
export function LegacyServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const cleanup = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const legacyRegistrations = registrations.filter(isLegacyPublicWorker);
      const removedWorkers = await Promise.all(legacyRegistrations.map((registration) => registration.unregister()));

      let removedCaches = false;
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        const legacyCacheKeys = cacheKeys.filter((key) => key.startsWith(LEGACY_CACHE_PREFIX));
        await Promise.all(legacyCacheKeys.map((key) => caches.delete(key)));
        removedCaches = legacyCacheKeys.length > 0;
      }

      if ((removedWorkers.some(Boolean) || removedCaches) && window.sessionStorage.getItem(RELOAD_KEY) !== "done") {
        window.sessionStorage.setItem(RELOAD_KEY, "done");
        window.location.reload();
      }
    };

    cleanup().catch(() => undefined);
  }, []);

  return null;
}
