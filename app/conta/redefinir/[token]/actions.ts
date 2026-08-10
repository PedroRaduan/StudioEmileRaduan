"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createClientSession } from "@/lib/client-auth/session";
import { getSystemPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";

export type ResetState = { error?: string };
const resetSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(128).regex(/[a-z]/, "Inclua uma letra minúscula.").regex(/[A-Z]/, "Inclua uma letra maiúscula.").regex(/\d/, "Inclua um número."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: "As senhas não conferem.", path: ["confirmPassword"] });

export async function resetClientPasswordAction(_: ResetState, formData: FormData): Promise<ResetState> {
  await assertSameOrigin();
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise a nova senha." };
  const passwordHash = await hashPassword(parsed.data.password);
  const prisma = getSystemPrisma();
  let accountId: { accountId: string; organizationId: string };
  try {
    accountId = await prisma.$transaction(async (tx) => {
      const token = await tx.clientPasswordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) }, include: { account: true } });
      if (!token || token.usedAt || token.expiresAt <= new Date()) throw new Error("INVALID_TOKEN");
      const consumed = await tx.clientPasswordResetToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) throw new Error("INVALID_TOKEN");
      await tx.clientAccount.update({ where: { id: token.accountId }, data: { passwordHash, isActive: true } });
      await tx.clientSession.deleteMany({ where: { accountId: token.accountId } });
      await tx.clientRecoveryRequest.updateMany({ where: { clientId: token.account.clientId, status: { in: ["OPEN", "CONTACTED"] } }, data: { status: "RESOLVED", resolvedAt: new Date() } });
      await tx.auditLog.create({ data: { action: "CLIENT_PASSWORD_RESET", entityType: "Client", entityId: token.account.clientId } });
      if (!token.organizationId) throw new Error("INVALID_TOKEN");
      return { accountId: token.accountId, organizationId: token.organizationId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TOKEN") return { error: "Este link expirou ou já foi utilizado. Solicite um novo ao studio." };
    return { error: "Não foi possível atualizar sua senha agora." };
  }
  await createClientSession(accountId.accountId, accountId.organizationId);
  redirect("/conta");
}
