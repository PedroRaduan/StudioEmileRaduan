import { validationTarget, safeFailure } from "./safety";

// This file is independently guarded: invoking it directly must not bypass safety.
const target = validationTarget(process.env);
process.env.DATABASE_URL = target.url;
const { getSystemPrisma } = await import("../../lib/db/prisma");
const { createFixtures, cleanupFixtures } = await import("./fixtures");
const { testTenantIsolation } = await import("./tenant-isolation");
const { testAppointmentConcurrency } = await import("./appointment-concurrency");
const { testInventory } = await import("./inventory");
const results: { name: string; status: "passed" | "failed"; detail?: string }[] = [];
const suite = process.argv[2] ?? "all";
let fixtures: Awaited<ReturnType<typeof createFixtures>> | undefined;
let stage = "criação de fixtures independentes";
try {
  fixtures = await createFixtures();
  for (const [name, test] of [
    ["tenant-isolation", suite !== "concurrency" ? testTenantIsolation : null],
    ["appointment-concurrency", suite !== "tenant" ? testAppointmentConcurrency : null],
    ["inventory-finance", suite === "all" ? testInventory : null],
  ] as const) {
    if (!test) continue;
    stage = name;
    await test(fixtures);
    results.push({ name, status: "passed" });
  }
} catch (error) {
  results.push({ name: stage, status: "failed", detail: safeFailure(error) });
  process.exitCode = 1;
} finally {
  try {
    if (fixtures) {
      await cleanupFixtures(fixtures);
      results.push({ name: "fixture-cleanup", status: "passed" });
    }
  } catch {
    results.push({ name: "fixture-cleanup", status: "failed", detail: "Limpeza incompleta. Não reutilize o banco sem inspeção." });
    process.exitCode = 1;
  }
  await getSystemPrisma().$disconnect();
  console.info("VALIDATION_RESULT=" + JSON.stringify(results));
}
