"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, requireOwner, requirePermission } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";
import { encryptSensitiveData } from "@/lib/security/sensitive-data";

export type ClientProfileState = { error?: string; success?: string; link?: string };

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
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  revalidatePath(`/admin/clientes/${client.id}`);
  return { success: "Link seguro criado. Ele expira em 2 horas e funciona uma única vez.", link: `${protocol}://${host}/conta/redefinir/${rawToken}` };
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
