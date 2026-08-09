import "server-only";
import { getPrisma } from "@/lib/db/prisma";

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

type RateLimitOptions = {
  identifierHash: string;
  ipHash: string | null;
  identifierLimit?: number;
  ipLimit?: number;
  windowMs?: number;
};

export async function isAuthRateLimited({
  identifierHash,
  ipHash,
  identifierLimit = 5,
  ipLimit = 20,
  windowMs = DEFAULT_WINDOW_MS,
}: RateLimitOptions) {
  const cutoff = new Date(Date.now() - windowMs);
  const prisma = getPrisma();
  const [identifierFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({ where: { identifierHash, succeeded: false, createdAt: { gt: cutoff } } }),
    ipHash
      ? prisma.loginAttempt.count({ where: { ipHash, succeeded: false, createdAt: { gt: cutoff } } })
      : Promise.resolve(0),
  ]);

  return identifierFailures >= identifierLimit || ipFailures >= ipLimit;
}

export function recordAuthAttempt(identifierHash: string, ipHash: string | null, succeeded: boolean) {
  return getPrisma().loginAttempt.create({ data: { identifierHash, ipHash, succeeded } });
}
