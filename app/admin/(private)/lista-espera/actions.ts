"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { createWaitlistEntry, offerCancellationToWaitlist, WaitlistError } from "@/lib/admin/waitlist";

export type WaitlistFormState = { error?: string; success?: string; link?: string };
const entrySchema = z.object({ clientId: z.string().cuid(), serviceId: z.string().cuid(), preferredResourceId: z.union([z.literal(""), z.string().cuid()]).transform((value) => value || null), preferredDays: z.array(z.coerce.number().int().min(0).max(6)).max(7), preferredPeriod: z.enum(["ANY", "MORNING", "AFTERNOON", "EVENING"]), earliestDate: z.union([z.literal(""), z.string().date()]).transform((value) => value ? new Date(`${value}T12:00:00Z`) : null), latestDate: z.union([z.literal(""), z.string().date()]).transform((value) => value ? new Date(`${value}T12:00:00Z`) : null), note: z.string().trim().max(500).transform((value) => value || null) });

export async function createWaitlistEntryAction(_: WaitlistFormState, formData: FormData): Promise<WaitlistFormState> {
  await assertSameOrigin();
  const staff = await requirePermission("WAITLIST_MANAGE");
  const parsed = entrySchema.safeParse({ ...Object.fromEntries(formData), preferredDays: formData.getAll("preferredDays") });
  if (!parsed.success) return { error: "Revise as preferências da lista de espera." };
  if (parsed.data.earliestDate && parsed.data.latestDate && parsed.data.earliestDate > parsed.data.latestDate) return { error: "A data inicial deve ser anterior à data final." };
  try {
    await createWaitlistEntry({ ...parsed.data, actorUserId: staff.id });
    revalidatePath("/admin/lista-espera");
    return { success: "Cliente adicionada à lista de espera." };
  } catch (error) { return { error: error instanceof WaitlistError ? error.message : "Não foi possível salvar a preferência." }; }
}

const offerSchema = z.object({ appointmentId: z.string().cuid(), waitlistEntryId: z.string().cuid() });
export async function offerWaitlistSlotAction(_: WaitlistFormState, formData: FormData): Promise<WaitlistFormState> {
  await assertSameOrigin();
  const staff = await requirePermission("WAITLIST_MANAGE");
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vaga ou cliente inválida." };
  const origin = process.env.APP_URL ?? "http://localhost:3000";
  try {
    const result = await offerCancellationToWaitlist({ ...parsed.data, actorUserId: staff.id, origin });
    revalidatePath("/admin/lista-espera");
    return { success: "Oferta protegida criada por 20 minutos.", link: result.link };
  } catch (error) { return { error: error instanceof WaitlistError ? error.message : "Não foi possível oferecer a vaga." }; }
}
