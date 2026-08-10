"use server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/auth/session";
import { getSystemPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";
export type RecoveryState = { error?: string; success?: string };
export async function requestAccountRecoveryAction(_: RecoveryState, formData: FormData): Promise<RecoveryState> { await assertSameOrigin(); const email = z.string().trim().email().max(254).safeParse(formData.get("email")); if (!email.success) return { error: "Informe um e-mail válido." }; const prisma = getSystemPrisma(); const user = await prisma.user.findUnique({ where: { email: email.data.toLowerCase() } }); if (user) { const rawToken = randomBytes(32).toString("base64url"); await prisma.$transaction([prisma.userPasswordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }), prisma.userPasswordResetToken.create({ data: { userId: user.id, tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } })]); /* O provedor de e-mail recebe o link em produção; o token nunca é retornado ao navegador. */ } return { success: "Se existir uma conta com este e-mail, enviaremos as instruções de recuperação." }; }
