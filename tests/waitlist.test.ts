import { describe, expect, it } from "vitest";
import { matchesWaitlistPreference } from "../lib/admin/waitlist-preferences";

describe("compatibilidade da lista de espera", () => {
  const timezone = "America/Sao_Paulo";
  it("aceita a vaga quando dia e faixa são compatíveis", () => {
    expect(matchesWaitlistPreference({ preferredDays: [1], preferredPeriod: "MORNING", earliestDate: null, latestDate: null }, new Date("2026-08-10T12:00:00.000Z"), timezone)).toBe(true);
  });
  it("recusa a vaga fora da faixa de horário solicitada", () => {
    expect(matchesWaitlistPreference({ preferredDays: [], preferredPeriod: "MORNING", earliestDate: null, latestDate: null }, new Date("2026-08-10T19:00:00.000Z"), timezone)).toBe(false);
  });
  it("recusa data fora do intervalo informado", () => {
    expect(matchesWaitlistPreference({ preferredDays: [], preferredPeriod: "ANY", earliestDate: new Date("2026-08-15T12:00:00Z"), latestDate: null }, new Date("2026-08-10T12:00:00.000Z"), timezone)).toBe(false);
  });
});
