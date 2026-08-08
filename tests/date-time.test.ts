import { describe, expect, it } from "vitest";
import { formatDate } from "../lib/date-time";

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
});
