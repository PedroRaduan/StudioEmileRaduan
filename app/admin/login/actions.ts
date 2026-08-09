"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, createSession, hashIp } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { isAuthRateLimited, recordAuthAttempt } from "@/lib/auth/rate-limit";
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
  const requestHeaders = await headers();
  const ipHash = hashIp(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"));
  const prisma = getPrisma();
  if (await isAuthRateLimited({ identifierHash, ipHash })) {
    return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await verifyPassword(user?.passwordHash, parsed.data.password);
  const isValid = Boolean(user?.isActive && passwordMatches);

  await recordAuthAttempt(identifierHash, ipHash, isValid);

  if (!isValid || !user) return { error: "E-mail ou senha incorretos." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({ data: { userId: user.id, action: "ADMIN_LOGIN", entityType: "User", entityId: user.id, ipHash } }),
  ]);
  await createSession(user.id);
  redirect("/admin");
}
