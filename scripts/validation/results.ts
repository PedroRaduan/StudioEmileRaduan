import { z } from "zod";
import { ValidationFailure } from "./safety";

const checkSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["passed", "failed"]),
  detail: z.string().max(500).optional(),
}).strict();
export type ValidationCheck = z.infer<typeof checkSchema>;

export function readSuiteResults(output: string) {
  const line = output.split(/\r?\n/).find((item) => item.startsWith("VALIDATION_RESULT="));
  try {
    return z.array(checkSchema).min(1).parse(JSON.parse(line?.slice("VALIDATION_RESULT=".length) ?? ""));
  } catch {
    throw new ValidationFailure("A suíte não produziu um relatório válido. Validação bloqueada.");
  }
}

export function assertSuitePassed(checks: ValidationCheck[], exitStatus: number | null, suite: string) {
  const expected = [
    ...(suite !== "concurrency" ? ["tenant-isolation"] : []),
    ...(suite !== "tenant" ? ["appointment-concurrency"] : []),
    ...(suite === "all" ? ["inventory-finance"] : []),
    "fixture-cleanup",
  ];
  if (exitStatus !== 0 || checks.some((check) => check.status !== "passed") ||
      checks.length !== expected.length || expected.some((name) => !checks.some((check) => check.name === name))) {
    throw new ValidationFailure("Isolamento, concorrência ou limpeza não foram aprovados integralmente.");
  }
}
