import { describe, expect, it } from "vitest";
import { isAgendaDate, shiftAgendaDate } from "../lib/agenda/navigation";
import { AGENDA_COLORS, agendaColor } from "../lib/agenda/colors";
import { nextTimelineStart, timelineSlots } from "../lib/agenda/timeline";

describe("datas e abertura da agenda", () => {
  it.each(["2026-02-30", "2026-13-01", "2026-00-01", "texto", undefined])("rejeita data impossível: %s", (date) => expect(isAgendaDate(date)).toBe(false));
  it("não pula fevereiro ao avançar a partir do dia 31", () => {
    expect(shiftAgendaDate("2026-01-31", "month", 1)).toBe("2026-02-28");
    expect(shiftAgendaDate("2024-03-31", "month", -1)).toBe("2024-02-29");
    expect(shiftAgendaDate("2026-12-31", "day", 1)).toBe("2027-01-01");
  });
  it("mantém 00:00 acessível e foca o primeiro atendimento, mesmo já passado", () => {
    expect(timelineSlots(0, 1440, 10)).toHaveLength(144);
    expect(timelineSlots(0, 1440, 10)[0]).toBe(0);
    expect(nextTimelineStart(900, [{ startsAtMinute: 600, endsAtMinute: 660 }, { startsAtMinute: 960, endsAtMinute: 1020 }])).toBe(600);
    expect(nextTimelineStart(900, [])).toBe(900);
  });
  it("mantém a cor original e recusa valores fora dos presets", () => {
    expect(agendaColor().value).toBe("#9A5B67");
    expect(agendaColor("url(javascript:alert(1))").value).toBe("#9A5B67");
    for (const color of AGENDA_COLORS) expect(agendaColor(color.value)).toEqual(color);
  });
});
