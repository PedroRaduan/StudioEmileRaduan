"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, requireOwner } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type SettingsFormState = { error?: string; success?: string };
const optionalText = z.string().trim().max(4000).optional().transform((value) => value || null);
const settingsSchema = z.object({
  studioName: z.string().trim().min(2).max(150), whatsapp: optionalText, email: z.union([z.literal(""), z.string().trim().email()]).transform((value) => value || null), instagram: optionalText,
  addressLine1: optionalText, city: optionalText, state: optionalText, publicIntro: optionalText, publicAbout: optionalText,
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), minNoticeHours: z.coerce.number().int().min(0).max(720), maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  onlineBookingEnabled: z.string().optional().transform((value) => value === "on"),
  bookingHoldMinutes: z.coerce.number().int().min(5).max(30),
  cancellationHours: z.coerce.number().int().min(0).max(720),
  rescheduleHours: z.coerce.number().int().min(0).max(720),
  maxClientReschedules: z.coerce.number().int().min(0).max(10),
  cancellationPolicy: optionalText,
});

export async function saveSettingsAction(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  await assertSameOrigin(); const owner = await requireOwner(); const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revise as informações do studio." };
  try {
    await getPrisma().$transaction([
      getPrisma().studioSettings.upsert({ where: { id: "studio" }, create: { id: "studio", ...parsed.data }, update: parsed.data }),
      getPrisma().auditLog.create({ data: { userId: owner.id, action: "SETTINGS_UPDATED", entityType: "StudioSettings", entityId: "studio" } }),
    ]);
    revalidatePath("/"); revalidatePath("/agendar"); revalidatePath("/admin/configuracoes");
    return { success: "Configurações salvas." };
  } catch { return { error: "Não foi possível salvar as configurações." }; }
}

export async function initializeAgendaAction() {
  await assertSameOrigin(); const owner = await requireOwner(); const prisma = getPrisma();
  const exists = await prisma.calendarResource.findFirst({ where: { isActive: true } });
  if (!exists) {
    const resource = await prisma.calendarResource.create({ data: { name: "Agenda principal" } });
    await prisma.auditLog.create({ data: { userId: owner.id, action: "CALENDAR_RESOURCE_CREATED", entityType: "CalendarResource", entityId: resource.id } });
  }
  revalidatePath("/admin/configuracoes/horarios"); redirect("/admin/configuracoes/horarios");
}

export async function saveHoursAction(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  await assertSameOrigin(); const owner = await requireOwner(); const prisma = getPrisma(); const resourceId = String(formData.get("resourceId") ?? "");
  const resource = await prisma.calendarResource.findFirst({ where: { id: resourceId, isActive: true } });
  if (!resource) return { error: "Agenda não encontrada." };
  const rules = [];
  for (let day = 0; day < 7; day += 1) {
    const enabled = formData.get(`enabled-${day}`) === "on";
    const start = String(formData.get(`start-${day}`) ?? ""); const end = String(formData.get(`end-${day}`) ?? "");
    const lunchStart = String(formData.get(`lunch-start-${day}`) ?? ""); const lunchEnd = String(formData.get(`lunch-end-${day}`) ?? "");
    if (enabled && (!validTime(start) || !validTime(end) || minutes(start) >= minutes(end))) return { error: "Revise o horário de início e término dos dias selecionados." };
    if ((lunchStart || lunchEnd) && (!validTime(lunchStart) || !validTime(lunchEnd) || minutes(lunchStart) >= minutes(lunchEnd))) return { error: "Revise o intervalo de almoço." };
    rules.push(prisma.availabilityRule.upsert({ where: { resourceId_dayOfWeek: { resourceId, dayOfWeek: day } }, create: { resourceId, dayOfWeek: day, startsAtMinute: enabled ? minutes(start) : 0, endsAtMinute: enabled ? minutes(end) : 0, lunchStartsAt: lunchStart ? minutes(lunchStart) : null, lunchEndsAt: lunchEnd ? minutes(lunchEnd) : null, isEnabled: enabled }, update: { startsAtMinute: enabled ? minutes(start) : 0, endsAtMinute: enabled ? minutes(end) : 0, lunchStartsAt: lunchStart ? minutes(lunchStart) : null, lunchEndsAt: lunchEnd ? minutes(lunchEnd) : null, isEnabled: enabled } }));
  }
  try {
    await prisma.$transaction([...rules, prisma.auditLog.create({ data: { userId: owner.id, action: "AVAILABILITY_UPDATED", entityType: "CalendarResource", entityId: resourceId } })]);
    revalidatePath("/admin/agenda"); return { success: "Horários atualizados." };
  } catch { return { error: "Não foi possível atualizar os horários." }; }
}

function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function minutes(value: string) { const [hours, mins] = value.split(":").map(Number); return hours * 60 + mins; }
