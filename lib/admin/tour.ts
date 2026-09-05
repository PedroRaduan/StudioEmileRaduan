import "server-only";
import { requireStaff } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

const action = "ADMIN_TOUR_PRESENTED";

// Reuse the durable, tenant-scoped audit store. No browser storage or schema migration.
export async function hasSeenAdminTour() {
  const user = await requireStaff();
  return Boolean(await getPrisma().auditLog.findFirst({
    where: { userId: user.id, action, entityType: "OrganizationMembership", entityId: user.membershipId },
    select: { id: true },
  }));
}

export async function recordAdminTourSeen() {
  const user = await requireStaff();
  if (await hasSeenAdminTour()) return;
  await getPrisma().auditLog.create({
    data: { userId: user.id, action, entityType: "OrganizationMembership", entityId: user.membershipId },
    select: { id: true },
  });
}
