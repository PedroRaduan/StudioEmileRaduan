import { describe, expect, it } from "vitest";
import { inventoryCostCents, inventoryItemSchema, inventoryMovementSchema } from "../lib/admin/inventory-input";
const input = { itemId: "cm123456789012345678901234", kind: "PURCHASE", quantity: 2, totalCostCents: 19990, requestKey: "784b42ca-84ee-4d32-b4be-ea2bbd4fe682" };
describe("validação de estoque", () => {
  it.each([["199,90", 19990], ["0.29", 29], ["2,5", 250]])("converte %s sem arredondar dinheiro", (value, cents) => expect(inventoryCostCents(String(value))).toBe(cents));
  it.each(["1e3", "-1", "0.001", "NaN", "<script>"])("recusa valor malformado %s", (value) => expect(inventoryCostCents(value)).toBeNaN());
  it("recusa saldo, tenant e campos extras enviados pelo formulário", () => {
    expect(inventoryItemSchema.safeParse({ name: "Luvas", minimum: 0, quantity: 50 }).success).toBe(false);
    expect(inventoryMovementSchema.safeParse({ ...input, organizationId: "foreign" }).success).toBe(false);
  });
  it("aceita compra e uso, sem despesa duplicada no consumo", () => {
    expect(inventoryMovementSchema.safeParse(input).success).toBe(true);
    expect(inventoryMovementSchema.safeParse({ ...input, kind: "USE", totalCostCents: 0 }).success).toBe(true);
    expect(inventoryMovementSchema.safeParse({ ...input, kind: "USE" }).success).toBe(false);
    expect(inventoryMovementSchema.safeParse({ ...input, quantity: -1 }).success).toBe(false);
    expect(inventoryMovementSchema.safeParse({ ...input, quantity: 0.5 }).success).toBe(false);
  });
});
