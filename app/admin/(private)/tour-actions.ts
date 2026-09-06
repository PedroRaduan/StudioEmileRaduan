"use server";
import { assertSameOrigin, requireOwner } from "@/lib/auth/session";
import { recordAdminTourSeen } from "@/lib/admin/tour";
import { getPrisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/tenancy/context";
import { tourPersonalizationSchema } from "@/lib/admin/tour-personalization";
import { revalidatePath } from "next/cache";

export async function saveTourPersonalizationAction(input: unknown): Promise<{ saved: boolean; error?: string }> {
  await assertSameOrigin();
  const owner = await requireOwner();
  const parsed = tourPersonalizationSchema.safeParse(input);
  if (!parsed.success) return { saved: false, error: "Revise o nome, a cor e o intervalo escolhidos." };
  const { organizationId } = await requireTenantContext();
  try {
    await getPrisma().$transaction(async (tx) => {
      await tx.studioSettings.upsert({ where: { organizationId }, create: parsed.data, update: parsed.data });
      await tx.auditLog.create({ data: { userId: owner.id, action: "TOUR_PERSONALIZATION_SAVED", entityType: "StudioSettings", entityId: organizationId, after: { primaryColor: parsed.data.primaryColor, calendarSlotInterval: parsed.data.calendarSlotInterval } } });
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/agendar");
    return { saved: true };
  } catch { return { saved: false, error: "Não foi possível salvar. Suas escolhas continuam aqui para tentar novamente." }; }
}

export async function markTourSeenAction(): Promise<{ saved: boolean }> {
  await assertSameOrigin();
  try {
    await recordAdminTourSeen();
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
