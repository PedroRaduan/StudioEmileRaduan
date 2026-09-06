import { randomUUID } from "node:crypto";
import { getPrisma } from "../../lib/db/prisma";
import { runWithTenant } from "../../lib/tenancy/context";
import { recordInventoryMovement, InventoryError } from "../../lib/admin/inventory";
import { ensure, type FixtureTenant } from "./fixtures";

export async function testInventory(tenants: FixtureTenant[]) {
  const [own, other] = tenants;
  const prisma = getPrisma();
  const item = await runWithTenant(own.context, () => prisma.inventoryItem.create({ data: { organizationId: own.organization.id, name: "Material de validação" } }));
  const purchase = { itemId: item.id, kind: "PURCHASE", quantity: 10, totalCostCents: 2900, requestKey: randomUUID() };
  await runWithTenant(own.context, async () => {
    await Promise.all([recordInventoryMovement(purchase, own.user.id), recordInventoryMovement(purchase, own.user.id)]);
    ensure((await prisma.inventoryItem.findUnique({ where: { id: item.id } }))?.quantity === 10, "Compra repetida duplicou saldo.");
    ensure(await prisma.expense.count({ where: { category: "Estoque" } }) === 1, "Compra repetida duplicou despesas.");
    const results = await Promise.allSettled([1, 2].map(() => recordInventoryMovement({ ...purchase, kind: "USE", quantity: 7, totalCostCents: 0, requestKey: randomUUID() }, own.user.id)));
    ensure(results.filter((result) => result.status === "fulfilled").length === 1, "Saídas concorrentes ultrapassaram saldo.");
    ensure(results.some((result) => result.status === "rejected" && result.reason instanceof InventoryError && result.reason.message.includes("Saldo insuficiente")), "Saída recusada por motivo inesperado.");
    ensure((await prisma.inventoryItem.findUnique({ where: { id: item.id } }))?.quantity === 3, "Saldo final de estoque incorreto.");
    ensure(await prisma.expense.count({ where: { category: "Estoque" } }) === 1, "Uso gerou uma despesa adicional.");
  });
  for (const context of [other.context, { ...own.context, role: "STAFF" as const }]) {
    let denied = false;
    try { await runWithTenant(context, () => recordInventoryMovement({ ...purchase, requestKey: randomUUID() }, other.user.id)); }
    catch (error) { denied = error instanceof InventoryError; }
    ensure(denied, "Movimento de estoque sem permissão foi aceito.");
  }
  await runWithTenant(other.context, async () => {
    ensure(await prisma.inventoryItem.findUnique({ where: { id: item.id } }) === null, "Estoque vazou entre empresas.");
    ensure(await prisma.inventoryMovement.count() === 0, "Movimentos vazaram entre empresas.");
  });
}
