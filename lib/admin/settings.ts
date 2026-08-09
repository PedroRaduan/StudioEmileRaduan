import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";
import { CURRENT_STUDIO_ID } from "@/lib/studio-config";

export async function getStudioSettings() {
  await requirePermission("SETTINGS_MANAGE");
  return getPrisma().studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID } });
}

export async function getPrimaryResource() {
  await requirePermission("SETTINGS_MANAGE");
  return getPrisma().calendarResource.findFirst({ where: { isActive: true }, include: { availabilityRules: { orderBy: { dayOfWeek: "asc" } } }, orderBy: { createdAt: "asc" } });
}
