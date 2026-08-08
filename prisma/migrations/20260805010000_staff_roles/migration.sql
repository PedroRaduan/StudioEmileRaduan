-- A recepcionista usa o mesmo studio, com permissões operacionais restritas.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RECEPTIONIST';

ALTER TABLE "Payment"
  ADD COLUMN "depositRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "depositAmountCents" INTEGER,
  ADD COLUMN "depositPaidCents" INTEGER NOT NULL DEFAULT 0;
