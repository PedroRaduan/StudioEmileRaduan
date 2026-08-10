import { describe, expect, it } from "vitest";
import { calculateDailyExpected } from "../lib/admin/finance-calculations";

describe("fechamento financeiro", () => {
  it("calcula o valor esperado sem usar ponto flutuante", () => {
    expect(calculateDailyExpected([19990, 5000], [7490, 2500])).toBe(15000);
  });
});
