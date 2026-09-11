import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync(new URL("../components/admin/first-visit-tour.tsx", import.meta.url), "utf8");
describe("guia simples", () => {
  it("não oferece simulações nem altera preferências", () => {
    expect(source).not.toContain("saveTourPersonalizationAction");
    expect(source).not.toContain("demoNextStatus");
    expect(source).not.toContain("<input");
    expect(source).toContain("markTourSeenAction");
  });
  it("usa estilos próprios, pode ser fechado e explica o histórico", () => {
    expect(source).toContain('"./first-visit-tour.module.css"');
    expect(source).toContain("onCancel");
    expect(source).toContain("Agenda → Histórico");
  });
});
