import { describe, expect, it } from "vitest";
import { assertSuitePassed, readSuiteResults, type ValidationCheck } from "../scripts/validation/results";

const passed: ValidationCheck[] = [
  { name: "tenant-isolation", status: "passed" },
  { name: "appointment-concurrency", status: "passed" },
  { name: "inventory-finance", status: "passed" },
  { name: "fixture-cleanup", status: "passed" },
];
describe("gate de aprovação do pré-deploy", () => {
  it("aprova somente após as duas suítes e a limpeza terminarem com exit 0", () => {
    const checks = readSuiteResults("VALIDATION_RESULT=" + JSON.stringify(passed));
    expect(() => assertSuitePassed(checks, 0, "all")).not.toThrow();
  });
  it.each(["tenant-isolation", "appointment-concurrency", "inventory-finance", "fixture-cleanup"])("bloqueia falha de %s mesmo se o subprocesso retornar exit 0 incorretamente", (name) => {
    const checks = passed.map((check) => check.name === name ? { ...check, status: "failed" as const } : check);
    expect(() => assertSuitePassed(checks, 0, "all")).toThrow();
  });
  it.each([1, null])("bloqueia erro ou encerramento por sinal, status %s", (status) => {
    expect(() => assertSuitePassed(passed, status, "all")).toThrow();
  });
  it("não aceita suíte omitida como uma aprovação", () => {
    expect(() => assertSuitePassed(passed.slice(1), 0, "all")).toThrow();
  });
  it.each(["", "PASSOU", "VALIDATION_RESULT=[]", "VALIDATION_RESULT=invalid"])("bloqueia relatório ausente ou inválido", (output) => {
    expect(() => readSuiteResults(output)).toThrow();
  });
});
