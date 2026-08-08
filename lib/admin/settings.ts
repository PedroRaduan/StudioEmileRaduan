import { getPrisma } from "@/lib/db/prisma";

export function getStudioSettings() {
  return getPrisma().studioSettings.findUnique({ where: { id: "studio" } });
}

export function getPrimaryResource() {
  return getPrisma().calendarResource.findFirst({ where: { isActive: true }, include: { availabilityRules: { orderBy: { dayOfWeek: "asc" } } }, orderBy: { createdAt: "asc" } });
}
