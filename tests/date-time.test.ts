import { describe, expect, it } from "vitest";
import { dateInTimezone, formatDate, greetingInTimezone, localDayRange } from "../lib/date-time";

describe("formatação de datas", () => {
  const value = new Date("2026-08-08T15:30:00.000Z");

  it("usa o estilo médio quando nenhuma opção é informada", () => {
    const expected = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(value);

    expect(formatDate(value)).toBe(expected);
  });

  it("aceita componentes específicos sem combiná-los com dateStyle", () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    const expected = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      ...options,
    }).format(value);

    expect(formatDate(value, options)).toBe(expected);
  });

  it("permite substituir o fuso horário", () => {
    expect(() => formatDate(value, {
      day: "2-digit",
      month: "long",
      timeZone: "UTC",
    })).not.toThrow();
  });

  it("calcula o início e o fim do dia mesmo quando o dia tem 23 horas", () => {
    const range = localDayRange("2026-03-08", "America/New_York");
    expect(range.start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(range.end.getTime() - range.start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it("calcula o início e o fim do dia quando o dia tem 25 horas", () => {
    const range = localDayRange("2026-11-01", "America/New_York");
    expect(range.start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(range.end.getTime() - range.start.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("recusa horários locais que não existem por causa do horário de verão", () => {
    expect(() => dateInTimezone("2026-03-08", "02:30", "America/New_York")).toThrow(RangeError);
  });

  it("recusa datas de calendário inválidas", () => {
    expect(() => dateInTimezone("2026-02-30", "10:00")).toThrow(RangeError);
  });

  it("usa a saudação correta no fuso do studio", () => {
    expect(greetingInTimezone("America/Sao_Paulo", new Date("2026-08-09T13:00:00.000Z"))).toBe("Bom dia");
    expect(greetingInTimezone("America/Sao_Paulo", new Date("2026-08-09T18:00:00.000Z"))).toBe("Boa tarde");
    expect(greetingInTimezone("America/Sao_Paulo", new Date("2026-08-09T22:00:00.000Z"))).toBe("Boa noite");
  });
});
