import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig, env } from "prisma/config";
import { enforcePostgresCertificateVerification } from "./lib/db/postgres-url";

// O Next.js usa .env.local no desenvolvimento, mas a CLI do Prisma não o
// carrega automaticamente. Variáveis já definidas pelo ambiente de produção
// continuam tendo prioridade sobre os arquivos locais.
for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) loadEnvFile(envFile);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: enforcePostgresCertificateVerification(env("DATABASE_URL")),
  },
});
