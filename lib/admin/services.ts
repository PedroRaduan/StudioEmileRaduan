import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";

export async function listServices() {
  await requirePermission("SERVICES_MANAGE");
  return getPrisma().service.findMany({
    select: {
      id: true, name: true, durationMinutes: true, preparationMinutes: true, cleanupMinutes: true,
      priceCents: true, promotionalPriceCents: true, calendarColor: true, isActive: true, isOnlineAvailable: true,
    },
    orderBy: [{ isActive: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
  });
}
