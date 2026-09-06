import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/tenancy/context";
import { can } from "@/lib/auth/permissions";
import { inventoryMovementSchema } from "./inventory-input";

export class InventoryError extends Error {}

export async function recordInventoryMovement(input: unknown, actorUserId: string) {
  const context = await requireTenantContext();
  if (!can(context.role, "FINANCE_MANAGE")) throw new InventoryError("Sem permissão para movimentar estoque.");
  const parsed = inventoryMovementSchema.safeParse(input);
  if (!parsed.success) throw new InventoryError("Revise a quantidade e o valor da compra.");
  const data = parsed.data;
  return getPrisma().$transaction(async (tx) => {
    // Row-level lock serializes purchases/uses and duplicate requests for this item.
    const changed = await tx.inventoryItem.updateMany({ where: { id: data.itemId }, data: { quantity: { increment: 0 } } });
    if (changed.count !== 1) throw new InventoryError("Produto não encontrado.");
    const previous = await tx.inventoryMovement.findFirst({ where: { requestKey: data.requestKey } });
    if (previous) {
      if (previous.itemId !== data.itemId || previous.kind !== data.kind || previous.quantity !== data.quantity || previous.totalCostCents !== data.totalCostCents) throw new InventoryError("Esta solicitação já foi usada. Atualize a página.");
      return previous;
    }
    const item = await tx.inventoryItem.findFirst({ where: { id: data.itemId } });
    if (!item) throw new InventoryError("Produto não encontrado.");
    const delta = data.kind === "PURCHASE" ? data.quantity : -data.quantity;
    if (item.quantity + delta < 0) throw new InventoryError("Saldo insuficiente para essa saída.");
    if (item.quantity + delta > 1000000) throw new InventoryError("Quantidade acima do limite permitido.");
    await tx.inventoryItem.updateMany({ where: { id: item.id }, data: { quantity: { increment: delta } } });
    const expense = data.kind === "PURCHASE" ? await tx.expense.create({ data: {
      organizationId: context.organizationId, description: `Compra de estoque: ${item.name}`, category: "Estoque",
      amountCents: data.totalCostCents, occurredAt: new Date(), status: "PAID", createdByUserId: actorUserId,
    } }) : null;
    const movement = await tx.inventoryMovement.create({ data: { ...data, organizationId: context.organizationId, expenseId: expense?.id } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "INVENTORY_MOVED", entityType: "InventoryMovement", entityId: movement.id, after: { kind: data.kind, quantity: data.quantity, expenseId: expense?.id ?? null } } });
    return movement;
  }, { maxWait: 5000, timeout: 10000 });
}
