import { describe, expect, it } from "vitest";
import { can } from "../lib/auth/permissions";

describe("permissões da equipe", () => {
  it("permite que a administradora acesse qualquer área", () => {
    expect(can("OWNER", "SETTINGS_MANAGE")).toBe(true);
    expect(can("OWNER", "SENSITIVE_CLIENT_VIEW")).toBe(true);
    expect(can("OWNER", "EXPORT_DATA")).toBe(true);
  });

  it("permite que a recepcionista cuide da agenda e clientes", () => {
    expect(can("RECEPTIONIST", "APPOINTMENTS_MANAGE")).toBe(true);
    expect(can("RECEPTIONIST", "CLIENTS_MANAGE")).toBe(true);
    expect(can("RECEPTIONIST", "PAYMENTS_RECORD")).toBe(true);
  });

  it("impede acesso da recepcionista a dados e configurações sensíveis", () => {
    expect(can("RECEPTIONIST", "SETTINGS_MANAGE")).toBe(false);
    expect(can("RECEPTIONIST", "SENSITIVE_CLIENT_VIEW")).toBe(false);
    expect(can("RECEPTIONIST", "REPORTS_VIEW")).toBe(false);
    expect(can("RECEPTIONIST", "EXPORT_DATA")).toBe(false);
  });
});
