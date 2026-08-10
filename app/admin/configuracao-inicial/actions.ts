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
  initialAdminSchema,
  isInitialSetupAllowed,
} from "@/lib/auth/initial-setup";
import { getSystemPrisma } from "@/lib/db/prisma";
import { DEFAULT_STUDIO_TIMEZONE, STUDIO_BRAND } from "@/lib/studio-config";

export type InitialSetupFormState = { error?: string };

export async function createInitialAdminAction(_: InitialSetupFormState, formData: FormData): Promise<InitialSetupFormState> {
  await assertSameOrigin();
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) return { error: "O banco de dados e a segurança da sessão precisam estar configurados antes de criar o acesso." };
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!isInitialSetupAllowed(host)) return { error: "A configuração inicial está fechada neste ambiente." };
  const parsed = initialAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };

  const prisma = getSystemPrisma();
  const passwordHash = await hashPassword(parsed.data.password);
  const ipHash = hashIp(requestHeaders.get("x-forwarded-for"));
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500);
  let createdAccount: { userId: string; organizationId: string };

  try {
    createdAccount = await prisma.$transaction(async (tx) => {
      // A função retorna `void`, tipo que o adapter-pg do Prisma 7 não
      // desserializa. O cast preserva o lock transacional e torna o retorno seguro.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${INITIAL_SETUP_LOCK_ID})::text AS "lock"`;
      if (await tx.user.count() > 0) throw new Error("SETUP_ALREADY_COMPLETED");
      const user = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "OWNER", isTemporary: false } });
      const organization = await tx.organization.create({ data: { name: STUDIO_BRAND.name, slug: `studio-${user.id.slice(-8).toLowerCase()}`, timezone: DEFAULT_STUDIO_TIMEZONE } });
      const membership = await tx.organizationMembership.create({ data: { userId: user.id, organizationId: organization.id, role: "OWNER" } });
      await tx.adminAgreement.createMany({ data: [
        { userId: user.id, type: "TERMS", version: ADMIN_TERMS_VERSION, ipHash, userAgent },
        { userId: user.id, type: "PRIVACY", version: ADMIN_PRIVACY_VERSION, ipHash, userAgent },
      ] });
      await tx.studioSettings.create({ data: { organizationId: organization.id, studioName: STUDIO_BRAND.name, timezone: DEFAULT_STUDIO_TIMEZONE, onlineBookingEnabled: false } });
      await tx.calendarResource.create({ data: { organizationId: organization.id, membershipId: membership.id, name: "Agenda principal" } });
      await tx.subscription.create({ data: { organizationId: organization.id, status: "FREE_BETA" } });
      await tx.auditLog.create({ data: { organizationId: organization.id, userId: user.id, action: "INITIAL_OWNER_CREATED", entityType: "User", entityId: user.id, ipHash, after: { termsVersion: ADMIN_TERMS_VERSION, privacyVersion: ADMIN_PRIVACY_VERSION } } });
      return { userId: user.id, organizationId: organization.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_ALREADY_COMPLETED") return { error: "O acesso administrativo já foi configurado. Entre com a conta existente." };
    if (typeof error === "object" && error !== null && "code" in error && ["P2002", "P2034"].includes(String(error.code))) return { error: "A configuração acabou de ser concluída em outra tentativa. Use a tela de entrada." };
    return { error: "Não foi possível criar o acesso agora. Verifique a conexão com o banco e tente novamente." };
  }

  await createSession(createdAccount.userId, createdAccount.organizationId);
  redirect("/admin?welcome=1");
}
