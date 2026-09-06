import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const agendaPage = readFileSync(new URL("../app/admin/(private)/agenda/page.tsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../components/admin/daily-agenda-timeline.tsx", import.meta.url), "utf8");
const currentTime = readFileSync(new URL("../components/admin/current-time-line.tsx", import.meta.url), "utf8");
const viewport = readFileSync(new URL("../components/admin/timeline-viewport.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("experiência de uso da agenda", () => {
  it("mantém os controles de data e visualização juntos em uma barra persistente", () => {
    expect(agendaPage).toContain('className="agenda-controls"');
    expect(styles).toContain(".agenda-controls { backdrop-filter");
    expect(styles).toContain("position: sticky");
    expect(styles).toContain(".agenda-controls { top: calc(61px + env(safe-area-inset-top) + 8px); }");
  });

  it("rola somente a área da timeline para posicionar o horário atual", () => {
    expect(viewport).toContain("board.current?.scrollTo");
    expect(currentTime).not.toContain("scrollTo");
    expect(currentTime).not.toContain("scrollIntoView");
  });

  it("preserva slots clicáveis e reduz rótulos visuais repetidos", () => {
    expect(timeline).toContain("timelineTickKind(minute)");
    expect(timeline).toContain("tick-${tickKind}");
    expect(styles).toContain(".timeline-slot:not(.tick-hour) time { visibility: hidden; }");
    expect(styles).toContain(".timeline-board { background");
    expect(styles).toContain("overflow: auto");
  });

  it("evita largura mínima rígida nas duas colunas do login", () => {
    expect(styles).toContain(".login-page { display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);");
    expect(styles).toContain(".login-aside { background: var(--rose-soft); min-width: 0;");
  });
});
