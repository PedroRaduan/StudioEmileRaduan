import { describe, expect, it } from "vitest";
import { initialAdminSchema, isInitialSetupAllowed, strongPasswordSchema } from "../lib/auth/admin-setup-policy";

describe("configuração inicial administrativa", () => {
  it("aceita uma senha longa e variada", () => {
    expect(strongPasswordSchema.safeParse("Agenda#Segura2026").success).toBe(true);
  });

  it("rejeita senha curta, previsível ou sem símbolo", () => {
    expect(strongPasswordSchema.safeParse("Senha123456").success).toBe(false);
    expect(strongPasswordSchema.safeParse("agendaSegura2026").success).toBe(false);
  });

  it("exige confirmação igual e todos os aceites", () => {
    const base = { name: "Emile Raduan", email: "emile@example.com", password: "Agenda#Segura2026", confirmPassword: "outra", termsAccepted: "on", privacyAccepted: "on", temporaryAccepted: "on" };
    expect(initialAdminSchema.safeParse(base).success).toBe(false);
    expect(initialAdminSchema.safeParse({ ...base, confirmPassword: base.password, privacyAccepted: "" }).success).toBe(false);
    expect(initialAdminSchema.safeParse({ ...base, confirmPassword: base.password }).success).toBe(true);
  });

  it("abre a configuração em hosts locais sem depender de uma porta específica", () => {
    const previousValue = process.env.INITIAL_SETUP_ENABLED;
    delete process.env.INITIAL_SETUP_ENABLED;
    try {
      expect(isInitialSetupAllowed("localhost:3000")).toBe(true);
      expect(isInitialSetupAllowed("127.0.0.1:3000")).toBe(true);
      expect(isInitialSetupAllowed("[::1]:3000")).toBe(true);
      expect(isInitialSetupAllowed("agenda.example.com")).toBe(false);
    } finally {
      if (previousValue === undefined) delete process.env.INITIAL_SETUP_ENABLED;
      else process.env.INITIAL_SETUP_ENABLED = previousValue;
    }
  });
});
