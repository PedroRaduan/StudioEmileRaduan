import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { enforcePostgresCertificateVerification } from "../lib/db/postgres-url";
import { safeFailure, validationTarget, ValidationFailure } from "./validation/safety";
import { assertSuitePassed, readSuiteResults } from "./validation/results";

const startedAt = new Date().toISOString();
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const runId = randomUUID();
const steps: { name: string; status: "passed" | "failed"; detail?: string }[] = [];
let stage = "proteção do banco";
let passed = false;
let target: ReturnType<typeof validationTarget> | undefined;
const suite = process.argv[2] ?? "all";

function command(name: string, entry: string, args: string[], env: NodeJS.ProcessEnv, verifySuite = false) {
  stage = name;
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: projectRoot, env, encoding: "utf8", timeout: 180_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  // Prisma diagnostics may contain URLs/SQL. Do not echo them into CI logs/artifacts.
  if (verifySuite) {
    const checks = readSuiteResults(result.stdout ?? "");
    steps.push(...checks);
    for (const check of checks) console.info(`${check.status === "passed" ? "PASSOU" : "FALHOU"}: ${check.name}${check.detail ? " — " + check.detail : ""}`);
    assertSuitePassed(checks, result.status, suite);
  }
  if (result.error || result.status !== 0) throw new ValidationFailure(`Etapa "${name}" falhou ou excedeu o tempo limite.`);
  steps.push({ name, status: "passed" });
  console.info(`PASSOU: ${name}`);
}

try {
  if (!["all", "tenant", "concurrency"].includes(suite)) throw new ValidationFailure("Suíte inválida.");
  target = validationTarget(process.env);
  const connection = new Client({
    connectionString: enforcePostgresCertificateVerification(target.url),
    connectionTimeoutMillis: 10_000, query_timeout: 10_000,
  });
  try {
    await connection.connect();
    const identity = await connection.query<{ database: string; username: string }>("SELECT current_database() AS database, current_user AS username");
    if (identity.rows[0]?.database !== target.database || identity.rows[0]?.username !== target.user) {
      throw new ValidationFailure("A identidade do banco conectado não corresponde ao destino autorizado.");
    }
  } finally { await connection.end(); }
  steps.push({ name: stage, status: "passed" });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: target.url,
    VALIDATION_DATABASE_URL: target.url,
    PREDEPLOY_VALIDATION: "1",
    SESSION_SECRET: randomBytes(32).toString("hex"),
    NODE_ENV: "test",
  };
  command("Prisma generate", resolve(projectRoot, "node_modules/prisma/build/index.js"), ["generate"], env);
  command("migrations no banco de validação", resolve(projectRoot, "node_modules/prisma/build/index.js"), ["migrate", "deploy"], env);
  command(`testes ${suite} e limpeza das fixtures`, "--conditions=react-server",
    ["--import", "tsx", "scripts/validation/run-suites.ts", suite], env, true);
  passed = true;
} catch (error) {
  const detail = safeFailure(error);
  steps.push({ name: stage, status: "failed", detail });
  console.error(`BLOQUEADO: ${detail}`);
  process.exitCode = 1;
} finally {
  const directory = resolve(projectRoot, "outputs/predeploy");
  mkdirSync(directory, { recursive: true });
  const reportPath = resolve(directory, `${runId}.json`);
  writeFileSync(reportPath, JSON.stringify({
    runId, startedAt, finishedAt: new Date().toISOString(), suite,
    status: passed ? "passed" : "failed",
    // A partial suite is diagnostic only; it never approves pre-deploy.
    predeployApproved: passed && suite === "all",
    target: target ? { host: target.host, database: target.database } : null,
    steps,
  }, null, 2));
  console.info(`Relatório: ${reportPath}`);
  if (passed) console.info(suite === "all" ? "PRÉ-DEPLOY APROVADO." : "Suíte parcial aprovada. Execute validate:predeploy para validar o conjunto.");
}
