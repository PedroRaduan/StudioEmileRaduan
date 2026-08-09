import { describe, expect, it } from "vitest";
import { isInsideWorkingHours, occupiedWindow, overlaps } from "../lib/agenda/rules";
import { isSchedulingConflictError } from "../lib/agenda/conflict-error";

describe("regras de agenda", () => {
  it("inclui preparo e intervalo no período ocupado", () => {
    const start = new Date("2026-08-03T12:00:00.000Z");
    const window = occupiedWindow(start, { durationMinutes: 60, preparationMinutes: 15, cleanupMinutes: 10 });
    expect(window.occupiedFrom.toISOString()).toBe("2026-08-03T11:45:00.000Z");
    expect(window.endsAt.toISOString()).toBe("2026-08-03T13:00:00.000Z");
    expect(window.occupiedUntil.toISOString()).toBe("2026-08-03T13:10:00.000Z");
  });

  it("considera intervalos que se tocam como horários compatíveis", () => {
    expect(overlaps(new Date("2026-08-03T12:00:00Z"), new Date("2026-08-03T13:00:00Z"), new Date("2026-08-03T13:00:00Z"), new Date("2026-08-03T14:00:00Z"))).toBe(false);
  });

  it("recusa atendimento fora do expediente", () => {
    const rule = { startsAtMinute: 540, endsAtMinute: 1080, lunchStartsAt: null, lunchEndsAt: null };
    expect(isInsideWorkingHours(540, 600, rule)).toBe(true);
    expect(isInsideWorkingHours(1050, 1110, rule)).toBe(false);
  });

  it("recusa atendimento que invade o horário de almoço", () => {
    const rule = { startsAtMinute: 540, endsAtMinute: 1080, lunchStartsAt: 720, lunchEndsAt: 780 };
    expect(isInsideWorkingHours(660, 720, rule)).toBe(true);
    expect(isInsideWorkingHours(690, 750, rule)).toBe(false);
  });

  it("reconhece a exclusão de intervalo retornada pelo adapter do PostgreSQL", () => {
    expect(isSchedulingConflictError({ code: "P2039", meta: { driverAdapterError: { cause: { originalCode: "23P01" } } } })).toBe(true);
    expect(isSchedulingConflictError({ code: "P2039", meta: { driverAdapterError: { cause: { originalCode: "22001" } } } })).toBe(false);
  });
});
