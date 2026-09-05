"use server";
import { assertSameOrigin } from "@/lib/auth/session";
import { recordAdminTourSeen } from "@/lib/admin/tour";

export async function markTourSeenAction(): Promise<{ saved: boolean }> {
  await assertSameOrigin();
  try {
    await recordAdminTourSeen();
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
