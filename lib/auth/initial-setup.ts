import { getPrisma } from "@/lib/db/prisma";
export { initialAdminSchema, isInitialSetupAllowed, strongPasswordSchema } from "./admin-setup-policy";

export const ADMIN_TERMS_VERSION = "2026-08-07";
export const ADMIN_PRIVACY_VERSION = "2026-08-07";
export const TEMPORARY_ACCESS_VERSION = "2026-08-07";
export const INITIAL_SETUP_LOCK_ID = 728104519;

export type AdminSetupState = "ready" | "needs_setup" | "unavailable";

export async function getAdminSetupState(): Promise<AdminSetupState> {
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) return "unavailable";
  try {
    return await getPrisma().user.count() > 0 ? "ready" : "needs_setup";
  } catch {
    return "unavailable";
  }
}
