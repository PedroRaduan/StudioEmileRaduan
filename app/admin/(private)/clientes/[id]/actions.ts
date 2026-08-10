"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, requireOwner, requirePermission } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";
import { encryptSensitiveData } from "@/lib/security/sensitive-data";
import { normalizeBrazilianPhone } from "@/lib/clients/phone";

export type ClientProfileState = { error?: string; success?: string; link?: string };

const clientDetailsSchema = z.object({
  clientId: z.string().cuid(),
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(150),
  preferredName: z.string().trim().max(150).optional().transform((value) => value || null),
  whatsapp: z.string().trim().max(30).optional().transform((value) => value || null),
  phone: z.string().trim().max(30).optional().transform((value) => value || null),
  email: z.union([z.literal(""), z.string().trim().email("Informe um e-mail válido.").max(254)]).transform((value) => value || null),
  birthDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")]).transform((value) => value || null),
  city: z.string().trim().max(250).optional().transform((value) => value || null),
  state: z.string().trim().max(250).optional().transform((value) => value || null),
});

export async function updateClientDetailsAction(_: ClientProfileState, formData: FormData): Promise<ClientProfileState> {
  await assertSameOrigin();
  const staff = await requirePermission("CLIENTS_MANAGE");
  const parsed = clientDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados da cliente." };
  const { clientId, birthDate, email, ...details } = parsed.data;
  const prisma = getPrisma();
  const before = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null }, include: { account: { select: { id: true } } } });
  if (!before) return { error: "Cliente não encontrada." };
  const normalizedEmail = email?.toLowerCase() ?? null;
  const phoneNormalized = normalizeBrazilianPhone(details.phone);
  const whatsappNormalized = normalizeBrazilianPhone(details.whatsapp);
  try {
    await prisma.$transaction(async (tx) => {
      const duplicate = await tx.client.findFirst({
        where: {
          id: { not: clientId },
          deletedAt: null,
          OR: [
            ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ...(phoneNormalized ? [{ phoneNormalized }, { whatsappNormalized: phoneNormalized }] : []),
            ...(whatsappNormalized ? [{ phoneNormalized: whatsappNormalized }, { whatsappNormalized }] : []),
          ],
        },
        select: { id: true },
      });
      if (duplicate) throw new DuplicateClientError();
      await tx.client.update({ where: { id: clientId }, data: { ...details, email: normalizedEmail, phoneNormalized, whatsappNormalized, birthDate: birthDate ? new Date(`${birthDate}T12:00:00Z`) : null } });
      if (before.account && normalizedEmail) await tx.clientAccount.update({ where: { id: before.account.id }, data: { email: normalizedEmail } });
      await tx.auditLog.create({ data: { userId: staff.id, action: "CLIENT_UPDATED", entityType: "Client", entityId: clientId, before: { fullName: before.fullName, preferredName: before.preferredName, whatsapp: before.whatsapp, phone: before.phone, email: before.email, city: before.city, state: before.state }, after: { ...details, email: normalizedEmail, birthDate } } });
    });
  } catch (error) {
    if (error instanceof DuplicateClientError) return { error: "Já existe uma cliente com este telefone, WhatsApp ou e-mail." };
    if (typeof error === "object" && error !== null && "code" in error && String(error.code) === "P2002") return { error: "Este e-mail já está vinculado a outro cadastro." };
    return { error: "Não foi possível atualizar a cliente. Tente novamente." };
  }
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath("/admin/clientes");
  return { success: "Dados da cliente atualizados." };
}

class DuplicateClientError extends Error {}

export async function prepareClientAccessAction(_: ClientProfileState, formData: FormData): Promise<ClientProfileState> {
  await assertSameOrigin();
  const owner = await requireOwner();
  const clientId = z.string().cuid().safeParse(formData.get("clientId"));
  if (!clientId.success) return { error: "Cliente inválida." };
  const prisma = getPrisma();
  const client = await prisma.client.findFirst({ where: { id: clientId.data, deletedAt: null }, include: { account: true } });
  if (!client?.email) return { error: "Cadastre um e-mail válido para ativar o acesso da cliente." };
  const account = client.account ?? await prisma.clientAccount.create({ data: { clientId: client.id, email: client.email.toLowerCase(), passwordHash: await hashPassword(randomBytes(48).toString("base64url")) } });
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.clientPasswordResetToken.deleteMany({ where: { accountId: account.id, usedAt: null } }),
    prisma.clientPasswordResetToken.create({ data: { accountId: account.id, tokenHash: sha256(rawToken), expiresAt } }),
    prisma.clientRecoveryRequest.updateMany({ where: { clientId: client.id, status: "OPEN" }, data: { status: "CONTACTED" } }),
    prisma.auditLog.create({ data: { userId: owner.id, action: "CLIENT_ACCESS_LINK_CREATED", entityType: "Client", entityId: client.id } }),
  ]);
  revalidatePath(`/admin/clientes/${client.id}`);
  return { success: "Link seguro criado. Ele expira em 2 horas e funciona uma única vez.", link: `${process.env.APP_URL ?? "http://localhost:3000"}/conta/redefinir/${rawToken}` };
}

const noteSchema = z.object({ clientId: z.string().cuid(), body: z.string().trim().min(2, "Escreva a observação.").max(4000) });
export async function addClientNoteAction(_: ClientProfileState, formData: FormData): Promise<ClientProfileState> {
  await assertSameOrigin(); const staff = await requirePermission("CLIENTS_MANAGE");
  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise a observação." };
  const note = await getPrisma().clientNote.create({ data: parsed.data });
  await getPrisma().auditLog.create({ data: { userId: staff.id, action: "CLIENT_NOTE_CREATED", entityType: "ClientNote", entityId: note.id } });
  revalidatePath(`/admin/clientes/${parsed.data.clientId}`);
  return { success: "Observação interna adicionada à linha do tempo." };
}

const healthSchema = z.object({
  clientId: z.string().cuid(),
  allergies: z.string().trim().max(1000), sensitivities: z.string().trim().max(1000), medications: z.string().trim().max(1000),
  pregnancy: z.string().trim().max(500), previousProcedures: z.string().trim().max(1500), restrictions: z.string().trim().max(1000),
  contraindications: z.string().trim().max(1000), importantNotes: z.string().trim().max(2000),
});
export async function saveHealthProfileAction(_: ClientProfileState, formData: FormData): Promise<ClientProfileState> {
  await assertSameOrigin(); const owner = await requirePermission("SENSITIVE_CLIENT_VIEW");
  const parsed = healthSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revise os dados importantes da cliente." };
  try {
    const { clientId, ...health } = parsed.data;
    await getPrisma().clientHealthProfile.upsert({ where: { clientId }, create: { clientId, encryptedPayload: encryptSensitiveData(health) }, update: { encryptedPayload: encryptSensitiveData(health), encryptionKeyVersion: { increment: 1 } } });
    await getPrisma().auditLog.create({ data: { userId: owner.id, action: "CLIENT_SENSITIVE_DATA_UPDATED", entityType: "Client", entityId: clientId } });
    revalidatePath(`/admin/clientes/${clientId}`);
    return { success: "Informações protegidas e salvas." };
  } catch { return { error: "Não foi possível proteger e salvar os dados. Verifique a chave de criptografia." }; }
}

const consentSchema = z.object({ clientId: z.string().cuid(), documentId: z.string().cuid(), granted: z.enum(["true", "false"]) });
export async function recordConsentAction(_: ClientProfileState, formData: FormData): Promise<ClientProfileState> {
  await assertSameOrigin(); const staff = await requirePermission("CLIENTS_MANAGE");
  const parsed = consentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Selecione um documento válido." };
  const document = await getPrisma().document.findFirst({ where: { id: parsed.data.documentId, isActive: true } });
  if (!document) return { error: "Este documento não está mais ativo." };
  const consent = await getPrisma().consent.create({ data: { clientId: parsed.data.clientId, documentId: document.id, granted: parsed.data.granted === "true", device: "Registro presencial pela equipe" } });
  await getPrisma().auditLog.create({ data: { userId: staff.id, action: "CONSENT_RECORDED", entityType: "Consent", entityId: consent.id, after: { documentId: document.id, version: document.version, granted: consent.granted } } });
  revalidatePath(`/admin/clientes/${parsed.data.clientId}`);
  return { success: "Aceite registrado com a versão do documento." };
}

const privacySchema = z.object({ clientId: z.string().cuid(), type: z.enum(["EXPORT", "CORRECTION", "DELETION"]), note: z.string().trim().max(1000).optional().transform((value) => value || null) });
export async function createPrivacyRequestAction(_: ClientProfileState, formData: FormData): Promise<ClientProfileState> {
  await assertSameOrigin(); const staff = await requirePermission("CLIENTS_MANAGE");
  const parsed = privacySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revise a solicitação de privacidade." };
  const request = await getPrisma().privacyRequest.create({ data: parsed.data });
  await getPrisma().auditLog.create({ data: { userId: staff.id, action: "PRIVACY_REQUEST_CREATED", entityType: "PrivacyRequest", entityId: request.id, after: { type: request.type } } });
  revalidatePath(`/admin/clientes/${parsed.data.clientId}`);
  return { success: "Solicitação registrada para análise da administradora." };
}
