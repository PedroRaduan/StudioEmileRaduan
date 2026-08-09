import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { enforcePostgresCertificateVerification } from "@/lib/db/postgres-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não foi configurada.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: enforcePostgresCertificateVerification(connectionString) }) });
}

export function getPrisma() {
  const prisma = globalForPrisma.prisma ?? createPrismaClient();
  // O adapter PostgreSQL mantém um pool de conexões. Reutilizar a instância
  // também em produção evita abrir um pool novo a cada chamada do mesmo
  // processo/serverless isolate.
  globalForPrisma.prisma = prisma;
  return prisma;
}
