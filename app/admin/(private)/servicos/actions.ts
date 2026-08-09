"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type ServiceFormState = { error?: string };
const intFromForm = (minimum: number, maximum: number) => z.coerce.number().int().min(minimum).max(maximum);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const money = (required = false) => z.string().trim().optional().transform((value, ctx) => {
  if (!value && !required) return null;
  const number = Number((value ?? "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe um valor válido." }); return z.NEVER; }
  return Math.round(number * 100);
});
const serviceSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço.").max(140),
  shortDescription: optionalText(300), fullDescription: optionalText(4000),
  durationMinutes: intFromForm(5, 720), preparationMinutes: intFromForm(0, 240), cleanupMinutes: intFromForm(0, 240),
  recommendedReturnDays: z.union([z.literal(""), intFromForm(1, 730)]).transform((value) => value === "" ? null : value),
  price: money(), promotionalPrice: money(), displayOrder: intFromForm(0, 9999), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Escolha uma cor válida."),
  minAdvanceHours: intFromForm(0, 720), maxAdvanceDays: intFromForm(1, 365),
  depositType: z.enum(["FIXED", "PERCENT"]).optional(), depositValue: z.string().trim().optional(),
  cancellationPolicy: optionalText(4000), beforeCare: optionalText(4000), afterCare: optionalText(4000),
});

function serviceData(formData: FormData) {
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados do serviço." } as const;
  const depositRequired = formData.get("depositRequired") === "on";
  let depositValue: number | null = null;
  if (depositRequired) {
    const raw = Number((parsed.data.depositValue ?? "").replace(",", "."));
    if (!Number.isFinite(raw) || raw <= 0) return { error: "Informe o valor ou percentual do sinal." } as const;
    if (parsed.data.depositType === "PERCENT" && raw > 100) return { error: "O percentual do sinal não pode passar de 100%." } as const;
    depositValue = parsed.data.depositType === "FIXED" ? Math.round(raw * 100) : Math.round(raw);
  }
  return { data: {
    name: parsed.data.name, shortDescription: parsed.data.shortDescription, fullDescription: parsed.data.fullDescription,
    durationMinutes: parsed.data.durationMinutes, preparationMinutes: parsed.data.preparationMinutes, cleanupMinutes: parsed.data.cleanupMinutes,
    recommendedReturnDays: parsed.data.recommendedReturnDays,
    priceCents: parsed.data.price, promotionalPriceCents: parsed.data.promotionalPrice, displayOrder: parsed.data.displayOrder,
    calendarColor: parsed.data.color, isOnlineAvailable: formData.get("showPublicly") === "on", isActive: formData.get("isActive") === "on",
    minAdvanceHours: parsed.data.minAdvanceHours, maxAdvanceDays: parsed.data.maxAdvanceDays,
    depositRequired, depositType: depositRequired ? parsed.data.depositType ?? "FIXED" : null, depositValue,
    cancellationPolicy: parsed.data.cancellationPolicy, beforeCare: parsed.data.beforeCare, afterCare: parsed.data.afterCare,
  } } as const;
}

export async function createServiceAction(_: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  await assertSameOrigin(); const owner = await requirePermission("SERVICES_MANAGE");
  const result = serviceData(formData); if ("error" in result) return result;
  try {
    await getPrisma().$transaction(async (tx) => {
      const service = await tx.service.create({ data: result.data });
      await tx.auditLog.create({ data: { userId: owner.id, action: "SERVICE_CREATED", entityType: "Service", entityId: service.id, after: { name: service.name } } });
    });
  } catch (error) { return { error: isUniqueError(error) ? "Já existe um serviço com este nome." : "Não foi possível salvar o serviço." }; }
  refreshServices(); redirect("/admin/servicos");
}

export async function updateServiceAction(_: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  await assertSameOrigin(); const owner = await requirePermission("SERVICES_MANAGE");
  const serviceId = z.string().cuid().safeParse(formData.get("serviceId"));
  if (!serviceId.success) return { error: "Serviço inválido." };
  const result = serviceData(formData); if ("error" in result) return result;
  const before = await getPrisma().service.findUnique({ where: { id: serviceId.data } });
  if (!before) return { error: "Serviço não encontrado." };
  try {
    await getPrisma().$transaction([
      getPrisma().service.update({ where: { id: before.id }, data: result.data }),
      getPrisma().auditLog.create({ data: { userId: owner.id, action: "SERVICE_UPDATED", entityType: "Service", entityId: before.id, before: { name: before.name, durationMinutes: before.durationMinutes, priceCents: before.priceCents }, after: { name: result.data.name, durationMinutes: result.data.durationMinutes, priceCents: result.data.priceCents } } }),
    ]);
  } catch (error) { return { error: isUniqueError(error) ? "Já existe um serviço com este nome." : "Não foi possível atualizar o serviço." }; }
  refreshServices(); redirect("/admin/servicos");
}

function refreshServices() { revalidatePath("/admin/servicos"); revalidatePath("/admin/agendamentos/novo"); revalidatePath("/"); }
function isUniqueError(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }
