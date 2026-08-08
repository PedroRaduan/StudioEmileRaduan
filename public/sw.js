const CACHE_NAME = "emile-raduan-shell-v5";
const STATIC_ASSETS = ["/", "/offline", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/manifest.webmanifest" || url.pathname === "/sw.js") return;
  const isNavigation = event.request.mode === "navigate";
  const sensitive = ["/admin", "/conta", "/agendar", "/agendamento", "/api"].some((prefix) => url.pathname.startsWith(prefix));

  // Rotas autenticadas e dados pessoais sempre usam a rede diretamente.
  // Isso evita cache de informações sensíveis e mantém compatibilidade com
  // a proteção de acesso aplicada pela hospedagem antes da aplicação.
  if (sensitive) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cacheable = url.pathname === "/" || url.pathname === "/offline" || url.pathname.startsWith("/_next/static/") || /\.(?:css|js|png|svg|webp|woff2)$/.test(url.pathname);
        if (response.ok && cacheable) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (isNavigation) return (await caches.match("/offline")) ?? Response.error();
        return Response.error();
      })
  );
});
