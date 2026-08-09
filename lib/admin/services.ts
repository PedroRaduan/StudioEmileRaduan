import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";

export async function listServices() {
  await requirePermission("SERVICES_MANAGE");
  return getPrisma().service.findMany({ orderBy: [{ isActive: "desc" }, { displayOrder: "asc" }, { name: "asc" }] });
}
