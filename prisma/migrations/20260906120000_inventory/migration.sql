-- Additive only. Apply first to the dedicated validation database.
CREATE TABLE "InventoryItem" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" BETWEEN 0 AND 1000000),
  "minimum" INTEGER NOT NULL DEFAULT 0 CHECK ("minimum" BETWEEN 0 AND 1000000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("organizationId", "name"), UNIQUE ("id", "organizationId")
);
CREATE UNIQUE INDEX "Expense_id_organizationId_key" ON "Expense"("id", "organizationId");
CREATE TABLE "InventoryMovement" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "itemId" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('PURCHASE', 'USE')),
  "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 1000000),
  "totalCostCents" INTEGER NOT NULL DEFAULT 0,
  "expenseId" TEXT UNIQUE REFERENCES "Expense"("id") ON DELETE RESTRICT,
  "requestKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId", "requestKey"),
  FOREIGN KEY ("itemId", "organizationId") REFERENCES "InventoryItem"("id", "organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("expenseId", "organizationId") REFERENCES "Expense"("id", "organizationId") ON DELETE RESTRICT,
  CHECK (("kind" = 'USE' AND "totalCostCents" = 0 AND "expenseId" IS NULL) OR
         ("kind" = 'PURCHASE' AND "totalCostCents" BETWEEN 1 AND 100000000 AND "expenseId" IS NOT NULL))
);
CREATE INDEX "InventoryMovement_organizationId_createdAt_idx" ON "InventoryMovement"("organizationId", "createdAt");
