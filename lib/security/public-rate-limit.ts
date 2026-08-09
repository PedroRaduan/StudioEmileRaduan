import "server-only";

import { getPrisma } from "@/lib/db/prisma";

export async function allowPublicMutation(input: { action: string; ipHash: string | null; limit?: number; windowMs?: number }) {
  const limit = input.limit ?? 8;
  const cutoff = new Date(Date.now() - (input.windowMs ?? 10 * 60 * 1000));
  const prisma = getPrisma();
  const count = await prisma.publicRequest.count({ where: { action: input.action, ipHash: input.ipHash, createdAt: { gt: cutoff } } });
  if (count >= limit) return false;
  await prisma.publicRequest.create({ data: { action: input.action, ipHash: input.ipHash } });
  return true;
}
