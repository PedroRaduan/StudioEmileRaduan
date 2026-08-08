"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, createSession, hashIp } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getAdminSetupState } from "@/lib/auth/initial-setup";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";

export type LoginState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  password: z.string().min(1, "Informe sua senha.").max(256),
});

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  await assertSameOrigin();
  const setupState = await getAdminSetupState();
  if (setupState === "needs_setup") redirect("/admin/configuracao-inicial");
  if (setupState === "unavailable") {
    return { error: "O acesso administrativo ainda não foi configurado." };
  }

  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };

  const email = parsed.data.email.toLowerCase();
  const identifierHash = sha256(email);
  const prisma = getPrisma();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  const failedAttempts = await prisma.loginAttempt.count({
    where: { identifierHash, succeeded: false, createdAt: { gt: cutoff } },
  });

  if (failedAttempts >= 5) {
    return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = Boolean(user?.isActive && user && await verifyPassword(user.passwordHash, parsed.data.password));
  const requestHeaders = await headers();

  await prisma.loginAttempt.create({
    data: { identifierHash, ipHash: hashIp(requestHeaders.get("x-forwarded-for")), succeeded: isValid },
  });

  if (!isValid || !user) return { error: "E-mail ou senha incorretos." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({ data: { userId: user.id, action: "ADMIN_LOGIN", entityType: "User", entityId: user.id, ipHash: hashIp(requestHeaders.get("x-forwarded-for")) } }),
  ]);
  await createSession(user.id);
  redirect("/admin");
}
