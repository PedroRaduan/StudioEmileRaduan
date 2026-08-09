import { describe, expect, it } from "vitest";
import { normalizeBrazilianPhone } from "../lib/clients/phone";

describe("normalizeBrazilianPhone", () => {
  it("normalizes Brazilian mobile and landline numbers", () => {
    expect(normalizeBrazilianPhone("(11) 99876-5432")).toBe("+5511998765432");
    expect(normalizeBrazilianPhone("1198765432")).toBe("+551198765432");
  });

  it("keeps an already international Brazilian number stable", () => {
    expect(normalizeBrazilianPhone("+55 11 99876-5432")).toBe("+5511998765432");
  });

  it("does not manufacture a number from empty input", () => {
    expect(normalizeBrazilianPhone(" ")).toBeNull();
  });
});
