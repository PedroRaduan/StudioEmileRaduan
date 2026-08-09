import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const worker = readFileSync(new URL("../public/admin-sw.js", import.meta.url), "utf8");

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
});
