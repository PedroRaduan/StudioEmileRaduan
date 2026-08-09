import { describe, expect, it } from "vitest";
import {
  CALENDAR_SLOT_INTERVALS,
  calendarSlotInterval,
  timelineBounds,
  timelinePixelsPerMinute,
  timelinePlacement,
  timelineSlots,
} from "../lib/agenda/timeline";

describe("timeline diária da agenda", () => {
  it.each(CALENDAR_SLOT_INTERVALS)("gera a grade de %i minutos sem alterar o intervalo real", (interval) => {
    const slots = timelineSlots(8 * 60, 10 * 60, interval);
    expect(slots).toHaveLength(120 / interval);
    expect(slots[0]).toBe(480);
    expect(slots[1] - slots[0]).toBe(interval);
  });

  it.each([20, 30, 45, 60, 90, 120])("representa visualmente uma duração de %i minutos de forma proporcional", (duration) => {
    const pixelsPerMinute = timelinePixelsPerMinute(10);
    const placement = timelinePlacement(9 * 60, 9 * 60 + duration, 8 * 60, pixelsPerMinute);
    expect(placement.height).toBe(duration * pixelsPerMinute);
    expect(placement.top).toBe(60 * pixelsPerMinute);
  });

  it("mantém a duração independente do intervalo escolhido para a grade", () => {
    const heights = CALENDAR_SLOT_INTERVALS.map((interval) => {
      const pixelsPerMinute = timelinePixelsPerMinute(interval);
      const placement = timelinePlacement(540, 585, 480, pixelsPerMinute);
      return placement.height / pixelsPerMinute;
    });
    expect(heights).toEqual([45, 45, 45, 45]);
  });

  it("estende os limites para não esconder um atendimento fora da rotina", () => {
    expect(timelineBounds(480, 1200, [{ startsAtMinute: 450, endsAtMinute: 1235 }], 15)).toEqual({ startsAtMinute: 450, endsAtMinute: 1245 });
  });

  it("usa 10 minutos como padrão para valores ausentes ou inválidos", () => {
    expect(calendarSlotInterval(undefined)).toBe(10);
    expect(calendarSlotInterval(12)).toBe(10);
  });
});
