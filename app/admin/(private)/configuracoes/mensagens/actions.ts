"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type TemplateFormState = { error?: string; success?: string };
const schema = z.object({ name: z.string().trim().min(3).max(150), channel: z.enum(["WHATSAPP", "EMAIL", "PUSH"]), body: z.string().trim().min(10, "Escreva a mensagem.").max(4000) });

export async function createMessageTemplateAction(_: TemplateFormState, formData: FormData): Promise<TemplateFormState> {
  await assertSameOrigin(); const owner = await requirePermission("SETTINGS_MANAGE");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise o modelo." };
  try {
    const template = await getPrisma().messageTemplate.create({ data: parsed.data });
    await getPrisma().auditLog.create({ data: { userId: owner.id, action: "MESSAGE_TEMPLATE_CREATED", entityType: "MessageTemplate", entityId: template.id, after: { name: template.name, channel: template.channel } } });
    revalidatePath("/admin/configuracoes/mensagens");
    return { success: "Modelo salvo e disponível para preparação manual." };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { error: "Já existe um modelo com este nome." };
    return { error: "Não foi possível salvar o modelo." };
  }
}

export async function toggleMessageTemplateAction(formData: FormData) {
  await assertSameOrigin(); const owner = await requirePermission("SETTINGS_MANAGE");
  const id = z.string().cuid().parse(formData.get("id"));
  const template = await getPrisma().messageTemplate.findUnique({ where: { id } });
  if (!template) return;
  await getPrisma().$transaction([
    getPrisma().messageTemplate.update({ where: { id }, data: { isActive: !template.isActive } }),
    getPrisma().auditLog.create({ data: { userId: owner.id, action: template.isActive ? "MESSAGE_TEMPLATE_DISABLED" : "MESSAGE_TEMPLATE_ENABLED", entityType: "MessageTemplate", entityId: id } }),
  ]);
  revalidatePath("/admin/configuracoes/mensagens");
}

