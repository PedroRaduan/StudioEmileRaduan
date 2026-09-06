import { z } from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(2).max(100), minimum: z.coerce.number().int().min(0).max(1000000),
}).strict();
export const inventoryMovementSchema = z.object({
  itemId: z.string().cuid(), kind: z.enum(["PURCHASE", "USE"]),
  quantity: z.coerce.number().int().min(1).max(1000000),
  totalCostCents: z.number().int().min(0).max(100000000), requestKey: z.string().uuid(),
}).strict().refine((value) => value.kind === "PURCHASE" ? value.totalCostCents > 0 : value.totalCostCents === 0);

/** Decimal text to integer cents; never multiply a floating-point money value. */
export function inventoryCostCents(value: string) {
  if (!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(value)) return NaN;
  const [whole, fraction = ""] = value.split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
