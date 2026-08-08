"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dateInTimezone } from "@/lib/date-time";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type AvailabilityFormState = { error?: string; success?: string };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const blockSchema = z.object({
  resourceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.string().regex(timePattern),
  endsAt: z.string().regex(timePattern),
  title: z.string().trim().min(2, "Informe o motivo do bloqueio.").max(150),
  note: z.string().trim().max(500).optional().transform((value) => value || null),
});

export async function createBlockAction(_: AvailabilityFormState, formData: FormData): Promise<AvailabilityFormState> {
  await assertSameOrigin();
  const owner = await requirePermission("SETTINGS_MANAGE");
  const parsed = blockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise o bloqueio." };
  const startsAt = dateInTimezone(parsed.data.date, parsed.data.startsAt);
  const endsAt = dateInTimezone(parsed.data.date, parsed.data.endsAt);
  if (endsAt <= startsAt) return { error: "O término precisa ser posterior ao início." };
  const prisma = getPrisma();
  const conflict = await prisma.appointment.findFirst({ where: { resourceId: parsed.data.resourceId, status: { in: ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE"] }, occupiedFrom: { lt: endsAt }, occupiedUntil: { gt: startsAt } } });
  if (conflict) return { error: "Já existe um atendimento nesse período. Reagende-o antes de bloquear." };
  const block = await prisma.scheduleBlock.create({ data: { resourceId: parsed.data.resourceId, startsAt, endsAt, title: parsed.data.title, note: parsed.data.note } });
  await prisma.auditLog.create({ data: { userId: owner.id, action: "SCHEDULE_BLOCK_CREATED", entityType: "ScheduleBlock", entityId: block.id, after: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), title: block.title } } });
  refreshAvailability();
  return { success: "Horário bloqueado. Novos agendamentos serão impedidos nesse período." };
}

const exceptionSchema = z.object({
  resourceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  note: z.string().trim().max(500).optional().transform((value) => value || null),
});

export async function saveExceptionAction(_: AvailabilityFormState, formData: FormData): Promise<AvailabilityFormState> {
  await assertSameOrigin();
  const owner = await requirePermission("SETTINGS_MANAGE");
  const parsed = exceptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revise a data da exceção." };
  const isClosed = formData.get("isClosed") === "on";
  const startsAtMinute = !isClosed && parsed.data.startsAt && timePattern.test(parsed.data.startsAt) ? toMinutes(parsed.data.startsAt) : null;
  const endsAtMinute = !isClosed && parsed.data.endsAt && timePattern.test(parsed.data.endsAt) ? toMinutes(parsed.data.endsAt) : null;
  if (!isClosed && (startsAtMinute === null || endsAtMinute === null || endsAtMinute <= startsAtMinute)) return { error: "Para horário especial, informe início e fim válidos." };
  const date = dateInTimezone(parsed.data.date, "00:00");
  const prisma = getPrisma();
  const exception = await prisma.availabilityException.upsert({ where: { resourceId_date: { resourceId: parsed.data.resourceId, date } }, create: { resourceId: parsed.data.resourceId, date, startsAtMinute, endsAtMinute, isClosed, note: parsed.data.note }, update: { startsAtMinute, endsAtMinute, isClosed, note: parsed.data.note } });
  await prisma.auditLog.create({ data: { userId: owner.id, action: "AVAILABILITY_EXCEPTION_SAVED", entityType: "AvailabilityException", entityId: exception.id, after: { date: parsed.data.date, isClosed, startsAtMinute, endsAtMinute } } });
  refreshAvailability();
  return { success: isClosed ? "Data marcada como fechada." : "Horário especial salvo para esta data." };
}

export async function deleteBlockAction(formData: FormData) {
  await assertSameOrigin();
  const owner = await requirePermission("SETTINGS_MANAGE");
  const id = z.string().cuid().parse(formData.get("id"));
  const block = await getPrisma().scheduleBlock.findUnique({ where: { id } });
  if (!block) return;
  await getPrisma().$transaction([
    getPrisma().scheduleBlock.delete({ where: { id } }),
    getPrisma().auditLog.create({ data: { userId: owner.id, action: "SCHEDULE_BLOCK_DELETED", entityType: "ScheduleBlock", entityId: id, before: { startsAt: block.startsAt.toISOString(), endsAt: block.endsAt.toISOString(), title: block.title } } }),
  ]);
  refreshAvailability();
}

export async function deleteExceptionAction(formData: FormData) {
  await assertSameOrigin();
  const owner = await requirePermission("SETTINGS_MANAGE");
  const id = z.string().cuid().parse(formData.get("id"));
  const exception = await getPrisma().availabilityException.findUnique({ where: { id } });
  if (!exception) return;
  await getPrisma().$transaction([
    getPrisma().availabilityException.delete({ where: { id } }),
    getPrisma().auditLog.create({ data: { userId: owner.id, action: "AVAILABILITY_EXCEPTION_DELETED", entityType: "AvailabilityException", entityId: id, before: { date: exception.date.toISOString(), isClosed: exception.isClosed } } }),
  ]);
  refreshAvailability();
}

function toMinutes(time: string) { const [hours, minutes] = time.split(":").map(Number); return hours * 60 + minutes; }
function refreshAvailability() { revalidatePath("/admin/configuracoes/bloqueios"); revalidatePath("/admin/agenda"); revalidatePath("/admin/agendamentos/novo"); }

