import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";
import { requireTenantContext } from "@/lib/tenancy/context";

export async function getStudioSettings() {
  await requirePermission("SETTINGS_MANAGE");
  return getPrisma().studioSettings.findUnique({ where: { organizationId: requireTenantContext().organizationId } });
}

export async function getCalendarSettings() {
  await requirePermission("SETTINGS_MANAGE");
  return getPrisma().studioSettings.findUnique({
    where: { organizationId: requireTenantContext().organizationId },
    select: { calendarSlotInterval: true },
  });
}

export async function getPrimaryResource() {
  await requirePermission("SETTINGS_MANAGE");
  return getPrisma().calendarResource.findFirst({ where: { isActive: true }, include: { availabilityRules: { orderBy: { dayOfWeek: "asc" } } }, orderBy: { createdAt: "asc" } });
}
