import { describe, expect, it } from "vitest";
import { originMatchesHost } from "../lib/security/origin";

describe("validação de origem", () => {
  it("aceita somente a mesma origem HTTP ou HTTPS", () => {
    expect(originMatchesHost("https://studio.example.com", "studio.example.com")).toBe(true);
    expect(originMatchesHost("http://localhost:3000", "localhost:3000")).toBe(true);
  });

  it("recusa host diferente, protocolo arbitrário e valores inválidos", () => {
    expect(originMatchesHost("https://evil.example", "studio.example.com")).toBe(false);
    expect(originMatchesHost("file://studio.example.com", "studio.example.com")).toBe(false);
    expect(originMatchesHost("não-é-url", "studio.example.com")).toBe(false);
  });
});
