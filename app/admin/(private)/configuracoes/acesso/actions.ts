"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, createSession, requireOwner } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ADMIN_PRIVACY_VERSION, ADMIN_TERMS_VERSION, strongPasswordSchema } from "@/lib/auth/initial-setup";
import { getPrisma } from "@/lib/db/prisma";

export type AccountAccessState = { error?: string; success?: string };

const finalizeSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(254).transform((value) => value.toLowerCase()),
  currentPassword: z.string().min(1, "Informe a senha atual.").max(128),
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  termsAccepted: z.literal("on", { errorMap: () => ({ message: "Confirme os termos para tornar o acesso definitivo." }) }),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As novas senhas não conferem." });

export async function finalizeOwnerAccessAction(_: AccountAccessState, formData: FormData): Promise<AccountAccessState> {
  await assertSameOrigin();
  const owner = await requireOwner();
  const parsed = finalizeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados." };
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: owner.id } });
  if (!user?.isTemporary) return { error: "Este acesso já é definitivo." };
  if (!await verifyPassword(user.passwordHash, parsed.data.currentPassword)) return { error: "A senha atual está incorreta." };
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, email: parsed.data.email, passwordHash, isTemporary: false } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.adminAgreement.createMany({ data: [
        { userId: user.id, type: "TERMS", version: ADMIN_TERMS_VERSION, userAgent: "Confirmação na administração" },
        { userId: user.id, type: "PRIVACY", version: ADMIN_PRIVACY_VERSION, userAgent: "Confirmação na administração" },
      ] }),
      prisma.auditLog.create({ data: { userId: user.id, action: "TEMPORARY_OWNER_FINALIZED", entityType: "User", entityId: user.id, before: { temporary: true }, after: { temporary: false, email: parsed.data.email } } }),
    ]);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && String(error.code) === "P2002") return { error: "Este e-mail já está em uso por outro acesso." };
    return { error: "Não foi possível tornar o acesso definitivo agora." };
  }

  await createSession(user.id);
  revalidatePath("/admin", "layout");
  return { success: "Acesso definitivo criado. As outras sessões foram encerradas." };
}
