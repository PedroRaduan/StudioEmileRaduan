"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type DocumentFormState = { error?: string; success?: string };
const schema = z.object({ type: z.enum(["PRIVACY", "COMMUNICATION", "PHOTO", "PROCEDURE"]), title: z.string().trim().min(3).max(180), version: z.string().trim().min(1).max(30), body: z.string().trim().min(20, "O documento precisa explicar claramente o aceite.").max(30000) });

export async function createDocumentAction(_: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  await assertSameOrigin(); const owner = await requirePermission("SETTINGS_MANAGE");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise o documento." };
  const prisma = getPrisma();
  try {
    const document = await prisma.$transaction(async (tx) => {
      await tx.document.updateMany({ where: { type: parsed.data.type, isActive: true }, data: { isActive: false } });
      return tx.document.create({ data: { ...parsed.data, isActive: true, publishedAt: new Date() } });
    });
    await prisma.auditLog.create({ data: { userId: owner.id, action: "DOCUMENT_PUBLISHED", entityType: "Document", entityId: document.id, after: { type: document.type, version: document.version } } });
    revalidatePath("/admin/configuracoes/termos");
    return { success: "Nova versão publicada. Os próximos aceites usarão este documento." };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { error: "Esta versão já existe para esse tipo de documento." };
    return { error: "Não foi possível publicar o documento." };
  }
}

export async function deactivateDocumentAction(formData: FormData) {
  await assertSameOrigin(); const owner = await requirePermission("SETTINGS_MANAGE");
  const id = z.string().cuid().parse(formData.get("id"));
  const document = await getPrisma().document.findUnique({ where: { id } });
  if (!document || !document.isActive) return;
  await getPrisma().$transaction([
    getPrisma().document.update({ where: { id }, data: { isActive: false } }),
    getPrisma().auditLog.create({ data: { userId: owner.id, action: "DOCUMENT_DEACTIVATED", entityType: "Document", entityId: id, before: { isActive: true }, after: { isActive: false } } }),
  ]);
  revalidatePath("/admin/configuracoes/termos");
}

