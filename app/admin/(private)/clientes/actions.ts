"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type ClientFormState = { error?: string };

const optionalText = z.string().trim().max(250).optional().transform((value) => value || null);
const clientSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(150),
  preferredName: optionalText, phone: optionalText, whatsapp: optionalText,
  email: z.union([z.literal(""), z.string().trim().email("Informe um e-mail válido.").max(254)]).transform((value) => value || null),
  birthDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((value) => value || null),
  instagram: optionalText, city: optionalText, state: optionalText, source: optionalText,
  internalNotes: z.string().trim().max(4000).optional().transform((value) => value || null),
});

export async function createClientAction(_: ClientFormState, formData: FormData): Promise<ClientFormState> {
  await assertSameOrigin();
  const owner = await requirePermission("CLIENTS_MANAGE");
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  let clientId: string;
  try {
    clientId = await getPrisma().$transaction(async (tx) => {
      const client = await tx.client.create({ data: { ...parsed.data, birthDate: parsed.data.birthDate ? new Date(`${parsed.data.birthDate}T12:00:00Z`) : null } });
      await tx.auditLog.create({ data: { userId: owner.id, action: "CLIENT_CREATED", entityType: "Client", entityId: client.id } });
      return client.id;
    });
  } catch (error) {
    if (isUniqueError(error)) return { error: "Já existe uma cliente cadastrada com este e-mail." };
    return { error: "Não foi possível cadastrar a cliente. Tente novamente." };
  }
  revalidatePath("/admin/clientes"); revalidatePath("/admin");
  redirect(`/admin/clientes/${clientId}`);
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
