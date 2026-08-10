import "server-only";

import { activateTenant, runWithTenant, type TenantContext } from "@/lib/tenancy/context";

export const LEGACY_ORGANIZATION_ID = "cm9x2v7s60000u3l8xm3q4z9a";

const legacyContext: TenantContext = {
  organizationId: LEGACY_ORGANIZATION_ID,
  membershipId: "public-legacy-booking",
  role: "RECEPTIONIST",
};

export function activateLegacyTenant() {
  activateTenant(legacyContext);
}

export async function runWithLegacyTenant<T>(operation: () => Promise<T>) {
  return runWithTenant(legacyContext, operation);
}
