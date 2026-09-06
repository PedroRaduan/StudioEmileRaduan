"use server";

import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export async function searchClientsAction(query: string) {
  await assertSameOrigin();
  await requirePermission("CLIENTS_MANAGE");
  const parsed = z.string().trim().min(2).max(100).safeParse(query);
  if (!parsed.success) return [];
  return getPrisma().client.findMany({
    where: { deletedAt: null, status: { not: "BLOCKED" }, OR: [{ fullName: { contains: parsed.data, mode: "insensitive" } }, { preferredName: { contains: parsed.data, mode: "insensitive" } }] },
    select: { id: true, fullName: true, preferredName: true }, orderBy: { fullName: "asc" }, take: 20,
  });
}
