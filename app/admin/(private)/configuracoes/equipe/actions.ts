"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getPrisma } from "@/lib/db/prisma";

export type StaffFormState = { error?: string; success?: string };

const staffSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da pessoa.").max(150),
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  password: z.string().min(12, "A senha precisa ter pelo menos 12 caracteres.").max(256),
  role: z.literal("RECEPTIONIST"),
});

export async function createStaffAction(_: StaffFormState, formData: FormData): Promise<StaffFormState> {
  await assertSameOrigin();
  const owner = await requirePermission("STAFF_MANAGE");
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados da equipe." };

  try {
    const staff = await getPrisma().user.create({
      data: { ...parsed.data, email: parsed.data.email.toLowerCase(), passwordHash: await hashPassword(parsed.data.password) },
    });
    await getPrisma().auditLog.create({ data: { userId: owner.id, action: "STAFF_CREATED", entityType: "User", entityId: staff.id, after: { role: staff.role, email: staff.email } } });
    revalidatePath("/admin/configuracoes/equipe");
    return { success: "Acesso da recepcionista criado com segurança." };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { error: "Este e-mail já está em uso." };
    return { error: "Não foi possível criar o acesso da equipe." };
  }
}

export async function toggleStaffAction(formData: FormData) {
  await assertSameOrigin();
  const owner = await requirePermission("STAFF_MANAGE");
  const userId = z.string().cuid().parse(formData.get("userId"));
  const user = await getPrisma().user.findUnique({ where: { id: userId } });
  if (!user || user.role === "OWNER" || user.id === owner.id) throw new Error("Este acesso não pode ser alterado por esta ação.");
  await getPrisma().$transaction([
    getPrisma().user.update({ where: { id: user.id }, data: { isActive: !user.isActive } }),
    getPrisma().session.deleteMany({ where: { userId: user.id } }),
    getPrisma().auditLog.create({ data: { userId: owner.id, action: user.isActive ? "STAFF_DISABLED" : "STAFF_ENABLED", entityType: "User", entityId: user.id, before: { isActive: user.isActive }, after: { isActive: !user.isActive } } }),
  ]);
  revalidatePath("/admin/configuracoes/equipe");
}

