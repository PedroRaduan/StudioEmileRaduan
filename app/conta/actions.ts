"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, hashIp } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isAuthRateLimited, recordAuthAttempt } from "@/lib/auth/rate-limit";
import { createClientSession, destroyClientSession, requireClient, safeReturnTo } from "@/lib/client-auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";
import { normalizeBrazilianPhone } from "@/lib/clients/phone";

export type ClientAuthState = { error?: string; success?: string };

const emailSchema = z.string().trim().email("Informe um e-mail válido.").max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(10, "Use pelo menos 10 caracteres.").max(128)
  .regex(/[a-z]/, "Inclua uma letra minúscula.")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
  .regex(/\d/, "Inclua um número.");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha.").max(256),
  returnTo: z.string().optional(),
});

export async function clientLoginAction(_: ClientAuthState, formData: FormData): Promise<ClientAuthState> {
  await assertSameOrigin();
  if (!process.env.DATABASE_URL) return { error: "O acesso da cliente ainda não foi configurado." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };

  const prisma = getPrisma();
  const identifierHash = sha256(`client:${parsed.data.email}`);
  const requestHeaders = await headers();
  const ipHash = hashIp(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"));
  if (await isAuthRateLimited({ identifierHash, ipHash })) return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };

  const account = await prisma.clientAccount.findUnique({ where: { email: parsed.data.email }, include: { client: true } });
  const passwordMatches = await verifyPassword(account?.passwordHash, parsed.data.password);
  const isValid = Boolean(account?.isActive && !account.client.deletedAt && passwordMatches);
  await recordAuthAttempt(identifierHash, ipHash, isValid);
  if (!account || !isValid) return { error: "E-mail ou senha incorretos." };

  await prisma.clientAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  await createClientSession(account.id);
  redirect(safeReturnTo(parsed.data.returnTo));
}

const signupSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo.").max(150),
  preferredName: z.string().trim().max(80).optional().transform((value) => value || null),
  whatsapp: z.string().trim().regex(/^\+?[\d\s().-]{10,20}$/, "Informe um WhatsApp válido."),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  privacyAccepted: z.literal("on", { errorMap: () => ({ message: "Aceite o tratamento dos dados para criar sua conta." }) }),
  communicationAccepted: z.string().optional(),
  returnTo: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

export async function clientSignupAction(_: ClientAuthState, formData: FormData): Promise<ClientAuthState> {
  await assertSameOrigin();
  if (!process.env.DATABASE_URL) return { error: "O cadastro ainda não foi configurado." };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };

  const prisma = getPrisma();
  const existing = await prisma.client.findUnique({ where: { email: parsed.data.email }, include: { account: true } });
  if (existing?.account) return { error: "Já existe uma conta com este e-mail. Entre com sua senha." };
  if (existing) return { error: "Seu cadastro já existe no studio. Fale com a equipe para ativar o acesso com segurança." };

  const passwordHash = await hashPassword(parsed.data.password);
  const requestHeaders = await headers();
  const ipHash = hashIp(requestHeaders.get("x-forwarded-for"));
  const documents = await prisma.document.findMany({ where: { isActive: true, type: { in: ["PRIVACY", "COMMUNICATION"] } }, orderBy: { publishedAt: "desc" } });
  const latestByType = new Map(documents.map((document) => [document.type, document]));

  let account: { id: string };
  try {
    account = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          fullName: parsed.data.fullName,
          preferredName: parsed.data.preferredName,
          whatsapp: parsed.data.whatsapp,
          phone: parsed.data.whatsapp,
          whatsappNormalized: normalizeBrazilianPhone(parsed.data.whatsapp),
          phoneNormalized: normalizeBrazilianPhone(parsed.data.whatsapp),
          email: parsed.data.email,
          source: "Cadastro on-line",
          contactPreference: "WHATSAPP",
        },
      });
      const created = await tx.clientAccount.create({ data: { clientId: client.id, email: parsed.data.email, passwordHash } });
      const consentData = [
        latestByType.get("PRIVACY") ? { clientId: client.id, documentId: latestByType.get("PRIVACY")!.id, granted: true, ipHash, device: requestHeaders.get("user-agent")?.slice(0, 500) } : null,
        parsed.data.communicationAccepted === "on" && latestByType.get("COMMUNICATION") ? { clientId: client.id, documentId: latestByType.get("COMMUNICATION")!.id, granted: true, ipHash, device: requestHeaders.get("user-agent")?.slice(0, 500) } : null,
      ].filter((value): value is NonNullable<typeof value> => Boolean(value));
      if (consentData.length) await tx.consent.createMany({ data: consentData });
      await tx.auditLog.create({ data: { action: "CLIENT_SELF_REGISTERED", entityType: "Client", entityId: client.id, ipHash } });
      return created;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && String(error.code) === "P2002") return { error: "Já existe um cadastro com este e-mail. Entre ou peça ajuda ao studio." };
    return { error: "Não foi possível criar sua conta agora. Tente novamente." };
  }

  await createClientSession(account.id);
  redirect(safeReturnTo(parsed.data.returnTo));
}

const recoverySchema = z.object({ email: emailSchema });

export async function requestRecoveryAction(_: ClientAuthState, formData: FormData): Promise<ClientAuthState> {
  await assertSameOrigin();
  const parsed = recoverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Informe seu e-mail." };
  if (process.env.DATABASE_URL) {
    const prisma = getPrisma();
    const account = await prisma.clientAccount.findUnique({ where: { email: parsed.data.email } });
    if (account) {
      const recent = await prisma.clientRecoveryRequest.findFirst({ where: { clientId: account.clientId, status: "OPEN", createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
      if (!recent) await prisma.clientRecoveryRequest.create({ data: { clientId: account.clientId } });
    }
  }
  return { success: "Se o e-mail estiver cadastrado, o studio receberá sua solicitação e fará o contato pelos dados já registrados. A recuperação automática ainda não está ativa." };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(3).max(150),
  preferredName: z.string().trim().max(80).optional().transform((value) => value || null),
  whatsapp: z.string().trim().regex(/^\+?[\d\s().-]{10,20}$/, "Informe um WhatsApp válido."),
  contactPreference: z.enum(["WHATSAPP", "PHONE", "EMAIL"]),
  communicationAccepted: z.string().optional(),
});

export async function updateClientProfileAction(_: ClientAuthState, formData: FormData): Promise<ClientAuthState> {
  await assertSameOrigin();
  const current = await requireClient();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise seus dados." };
  await getPrisma().client.update({
    where: { id: current.clientId },
    data: { fullName: parsed.data.fullName, preferredName: parsed.data.preferredName, whatsapp: parsed.data.whatsapp, phone: parsed.data.whatsapp, whatsappNormalized: normalizeBrazilianPhone(parsed.data.whatsapp), phoneNormalized: normalizeBrazilianPhone(parsed.data.whatsapp), contactPreference: parsed.data.contactPreference },
  });
  const communicationDocument = await getPrisma().document.findFirst({ where: { isActive: true, type: "COMMUNICATION" }, orderBy: { publishedAt: "desc" } });
  if (communicationDocument) await getPrisma().consent.create({ data: { clientId: current.clientId, documentId: communicationDocument.id, granted: parsed.data.communicationAccepted === "on", device: "Preferência atualizada na área da cliente" } });
  revalidatePath("/conta");
  revalidatePath("/conta/perfil");
  return { success: "Seus dados foram atualizados." };
}

export async function clientLogoutAction() {
  await assertSameOrigin();
  await destroyClientSession();
  redirect("/");
}
