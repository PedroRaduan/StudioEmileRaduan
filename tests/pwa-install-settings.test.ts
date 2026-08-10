import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const installProvider = readFileSync(new URL("../components/pwa-install.tsx", import.meta.url), "utf8");
const installSettingsPage = readFileSync(new URL("../app/admin/(private)/configuracoes/instalar-app/page.tsx", import.meta.url), "utf8");
const installPanel = readFileSync(new URL("../app/admin/(private)/configuracoes/instalar-app/install-app-panel.tsx", import.meta.url), "utf8");

describe("instalação do PWA pelas configurações", () => {
  it("mantém o prompt nativo disponível para a tela de configurações", () => {
    expect(installProvider).toContain('window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)');
    expect(installProvider).toContain("await deferredPrompt.prompt()");
    expect(installProvider).toContain("await deferredPrompt.userChoice");
  });

  it("protege a tela e apresenta alternativas seguras conforme o navegador", () => {
    expect(installSettingsPage).toContain("await requireOwner()");
    expect(installPanel).toContain("Instale pelo menu do Safari.");
    expect(installPanel).toContain("Instalar aplicativo");
    expect(installPanel).toContain("Preparando a instalação.");
  });
});
