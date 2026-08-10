import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const worker = readFileSync(new URL("../public/admin-sw.js", import.meta.url), "utf8");
const register = readFileSync(new URL("../components/pwa-register.tsx", import.meta.url), "utf8");
const legacyCleanup = readFileSync(new URL("../components/legacy-service-worker-cleanup.tsx", import.meta.url), "utf8");
const manifestRoute = readFileSync(new URL("../app/admin/manifest.webmanifest/route.ts", import.meta.url), "utf8");

describe("política de cache do PWA administrativo", () => {
  it("mantém navegações administrativas em modo network-only", () => {
    expect(worker).toContain('event.request.mode === "navigate"');
    expect(worker).toContain('fetch(event.request, { cache: "no-store" })');
    expect(worker).toContain('const OFFLINE_URL = "/admin/offline"');
  });

  it("restringe o cache a arquivos estáticos não sensíveis", () => {
    expect(worker).toContain('url.pathname.startsWith("/_next/static/")');
    expect(worker).not.toMatch(/pathname\.startsWith\(["']\/api/);
    expect(worker).not.toMatch(/cache\.put\([^)]*(appointment|client|agenda)/i);
  });

  it("remove somente caches pertencentes ao próprio PWA", () => {
    expect(worker).toContain('key.startsWith(CACHE_PREFIX)');
    expect(worker).not.toContain("caches.delete(key))));\n  self.clients.claim");
  });

  it("não mantém service worker ativo durante o desenvolvimento", () => {
    expect(register).toContain('process.env.NODE_ENV !== "production"');
    expect(register).toContain('key.startsWith("emile-admin-shell-")');
    expect(register).toContain("registration.unregister()");
  });

  it("remove somente o worker público legado e seu cache", () => {
    expect(legacyCleanup).toContain('new URL(worker.scriptURL).pathname === "/sw.js"');
    expect(legacyCleanup).toContain('key.startsWith(LEGACY_CACHE_PREFIX)');
    expect(legacyCleanup).toContain("registration.unregister()");
  });

  it("mantém a rota inicial dentro do escopo administrativo do manifesto", () => {
    expect(manifestRoute).toContain('start_url: "/admin/"');
    expect(manifestRoute).toContain('scope: "/admin/"');
  });
});
