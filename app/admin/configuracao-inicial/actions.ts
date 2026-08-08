"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { assertSameOrigin, createSession, hashIp } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  ADMIN_PRIVACY_VERSION,
  ADMIN_TERMS_VERSION,
  INITIAL_SETUP_LOCK_ID,
  TEMPORARY_ACCESS_VERSION,
  initialAdminSchema,
  isInitialSetupAllowed,
} from "@/lib/auth/initial-setup";
import { getPrisma } from "@/lib/db/prisma";

export type InitialSetupFormState = { error?: string };

export async function createInitialAdminAction(_: InitialSetupFormState, formData: FormData): Promise<InitialSetupFormState> {
  await assertSameOrigin();
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) return { error: "O banco de dados e a segurança da sessão precisam estar configurados antes de criar o acesso." };
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!isInitialSetupAllowed(host)) return { error: "A configuração inicial está fechada neste ambiente." };
  const parsed = initialAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };

  const prisma = getPrisma();
  const passwordHash = await hashPassword(parsed.data.password);
  const ipHash = hashIp(requestHeaders.get("x-forwarded-for"));
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500);
  let userId: string;

  try {
    userId = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${INITIAL_SETUP_LOCK_ID})`;
      if (await tx.user.count() > 0) throw new Error("SETUP_ALREADY_COMPLETED");
      const user = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "OWNER", isTemporary: true } });
      await tx.adminAgreement.createMany({ data: [
        { userId: user.id, type: "TERMS", version: ADMIN_TERMS_VERSION, ipHash, userAgent },
        { userId: user.id, type: "PRIVACY", version: ADMIN_PRIVACY_VERSION, ipHash, userAgent },
        { userId: user.id, type: "TEMPORARY_ACCESS", version: TEMPORARY_ACCESS_VERSION, ipHash, userAgent },
      ] });
      await tx.studioSettings.upsert({ where: { id: "studio" }, create: { id: "studio", studioName: "Emile Raduan Beauty Face", timezone: "America/Sao_Paulo", onlineBookingEnabled: false }, update: {} });
      if (!await tx.calendarResource.findFirst({ where: { isActive: true } })) await tx.calendarResource.create({ data: { name: "Agenda principal" } });
      await tx.auditLog.create({ data: { userId: user.id, action: "TEMPORARY_OWNER_CREATED_FROM_SETUP", entityType: "User", entityId: user.id, ipHash, after: { termsVersion: ADMIN_TERMS_VERSION, privacyVersion: ADMIN_PRIVACY_VERSION, temporary: true } } });
      return user.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_ALREADY_COMPLETED") return { error: "O acesso administrativo já foi configurado. Entre com a conta existente." };
    if (typeof error === "object" && error !== null && "code" in error && ["P2002", "P2034"].includes(String(error.code))) return { error: "A configuração acabou de ser concluída em outra tentativa. Use a tela de entrada." };
    return { error: "Não foi possível criar o acesso agora. Verifique a conexão com o banco e tente novamente." };
  }

  await createSession(userId);
  redirect("/admin?welcome=1");
}
