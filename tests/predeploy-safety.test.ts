import { describe, expect, it } from "vitest";
import { safeFailure, validationTarget } from "../scripts/validation/safety";

const valid = {
  VALIDATION_ENV: "ci",
  VALIDATION_DATABASE_URL: "postgresql://agenda_validation:disposable@127.0.0.1:54339/agenda_validation",
  VALIDATION_DB_ACK: "dedicated-non-production-database",
};
describe("proteção do banco de pré-deploy", () => {
  it("aceita somente destino explicitamente autorizado, independente do DATABASE_URL da aplicação", () => {
    expect(validationTarget({ ...valid, DATABASE_URL: "postgresql://prod:secret@prod.example/app" }).database).toBe("agenda_validation");
  });
  it.each([
    { VALIDATION_ENV: undefined }, { VALIDATION_ENV: "production" }, { NODE_ENV: "production" },
    { VERCEL_ENV: "production" }, { VALIDATION_DB_ACK: undefined },
    { VALIDATION_DATABASE_URL: undefined }, { VALIDATION_DATABASE_URL: "invalid" },
    { VALIDATION_DATABASE_URL: "postgresql://agenda_validation:x@localhost/emile_agenda" },
    { VALIDATION_DATABASE_URL: "postgresql://postgres:x@localhost/agenda_validation" },
    { VALIDATION_DATABASE_URL: valid.VALIDATION_DATABASE_URL + "?host=production" },
    { VALIDATION_DATABASE_URL: valid.VALIDATION_DATABASE_URL + "?options=unsafe" },
    { VALIDATION_DATABASE_URL: "postgresql://agenda_validation:x@remote.example/agenda_validation" },
  ])("recusa configuração perigosa ou ausente: %j", (override) => {
    expect(() => validationTarget({ ...valid, ...override })).toThrow();
  });
  it("exige hostname exato e TLS para staging remoto", () => {
    const staging = { ...valid, VALIDATION_ENV: "staging", VALIDATION_ALLOWED_HOST: "validation.example",
      VALIDATION_DATABASE_URL: "postgresql://agenda_validation:x@validation.example/agenda_validation_staging?sslmode=verify-full" };
    expect(validationTarget(staging).host).toBe("validation.example");
    expect(() => validationTarget({ ...staging, VALIDATION_ALLOWED_HOST: "other.example" })).toThrow();
    expect(() => validationTarget({ ...staging, VALIDATION_DATABASE_URL: staging.VALIDATION_DATABASE_URL.replace("verify-full", "disable") })).toThrow();
  });
  it("não divulga conexão, SQL ou senha em falhas inesperadas", () => {
    expect(safeFailure(new Error("postgresql://user:secret@host/database SELECT * FROM private"))).not.toMatch(/secret|SELECT|postgresql/);
  });
});
