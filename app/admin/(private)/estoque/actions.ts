"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { requireTenantContext } from "@/lib/tenancy/context";
import { getPrisma } from "@/lib/db/prisma";
import { inventoryCostCents, inventoryItemSchema } from "@/lib/admin/inventory-input";
import { InventoryError, recordInventoryMovement } from "@/lib/admin/inventory";

export type InventoryState = { error?: string; success?: string; requestKey?: string };
export async function addInventoryItemAction(_: InventoryState, form: FormData): Promise<InventoryState> {
  await assertSameOrigin(); const user = await requirePermission("FINANCE_MANAGE");
  const parsed = inventoryItemSchema.safeParse({ name: form.get("name"), minimum: form.get("minimum") });
  if (!parsed.success) return { error: "Informe o nome e um estoque mínimo válido." };
  const { organizationId } = await requireTenantContext();
  try {
    await getPrisma().$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({ data: { ...parsed.data, organizationId } });
      await tx.auditLog.create({ data: { userId: user.id, action: "INVENTORY_ITEM_CREATED", entityType: "InventoryItem", entityId: item.id } });
    });
    revalidatePath("/admin/estoque"); return { success: "Produto cadastrado. Registre uma compra para adicionar unidades." };
  } catch { return { error: "Não foi possível cadastrar. Verifique se esse nome já existe." }; }
}
export async function moveInventoryAction(_: InventoryState, form: FormData): Promise<InventoryState> {
  await assertSameOrigin(); const user = await requirePermission("FINANCE_MANAGE");
  try {
    await recordInventoryMovement({ itemId: form.get("itemId"), kind: form.get("kind"), quantity: form.get("quantity"),
      requestKey: form.get("requestKey"), totalCostCents: inventoryCostCents(String(form.get("cost") ?? "0")) }, user.id);
    revalidatePath("/admin/estoque"); revalidatePath("/admin/financeiro");
    return { success: "Movimentação registrada.", requestKey: randomUUID() };
  } catch (error) { return { requestKey: _.requestKey, error: error instanceof InventoryError ? error.message : "Não foi possível salvar. Tente novamente." }; }
}
