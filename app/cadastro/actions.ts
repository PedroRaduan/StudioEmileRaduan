"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getSystemPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";

export type SignupState = { error?: string };

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(150),
  email: z.string().trim().email("Informe um e-mail válido.").max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(128).regex(/[a-z]/, "Inclua uma letra minúscula.").regex(/[A-Z]/, "Inclua uma letra maiúscula.").regex(/\d/, "Inclua um número."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

export async function signupAction(_: SignupState, formData: FormData): Promise<SignupState> {
  await assertSameOrigin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  const prisma = getSystemPrisma();
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) return { error: "Não foi possível concluir este cadastro com os dados informados." };
  const passwordHash = await hashPassword(parsed.data.password);
  try {
    const created = await prisma.$transaction(async (tx) => {
      const account = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "OWNER" } });
      const verificationToken = randomBytes(32).toString("base64url");
      await tx.userEmailVerificationToken.create({ data: { userId: account.id, tokenHash: sha256(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      return account;
    });
    await createSession(created.id);
  } catch {
    return { error: "Não foi possível criar sua conta agora. Tente novamente." };
  }
  redirect("/onboarding");
}
