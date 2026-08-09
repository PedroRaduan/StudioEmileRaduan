ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRMATION';

ALTER TABLE "Service"
ADD COLUMN "recommendedReturnDays" INTEGER;

ALTER TABLE "Appointment"
ADD COLUMN "confirmedAt" TIMESTAMP(3);

ALTER TABLE "Client"
ADD COLUMN "phoneNormalized" TEXT,
ADD COLUMN "whatsappNormalized" TEXT;

UPDATE "Client"
SET "phoneNormalized" = CASE
  WHEN phone IS NULL OR regexp_replace(phone, '\\D', '', 'g') = '' THEN NULL
  WHEN length(regexp_replace(phone, '\\D', '', 'g')) IN (10, 11) THEN '+55' || regexp_replace(phone, '\\D', '', 'g')
  ELSE '+' || regexp_replace(phone, '\\D', '', 'g')
END,
"whatsappNormalized" = CASE
  WHEN whatsapp IS NULL OR regexp_replace(whatsapp, '\\D', '', 'g') = '' THEN NULL
  WHEN length(regexp_replace(whatsapp, '\\D', '', 'g')) IN (10, 11) THEN '+55' || regexp_replace(whatsapp, '\\D', '', 'g')
  ELSE '+' || regexp_replace(whatsapp, '\\D', '', 'g')
END;

CREATE INDEX "Client_phoneNormalized_idx" ON "Client"("phoneNormalized");
CREATE INDEX "Client_whatsappNormalized_idx" ON "Client"("whatsappNormalized");

CREATE TABLE "PublicRequest" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicRequest_action_ipHash_createdAt_idx" ON "PublicRequest"("action", "ipHash", "createdAt");

ALTER TABLE "Service"
ADD CONSTRAINT "Service_recommendedReturnDays_check"
CHECK ("recommendedReturnDays" IS NULL OR "recommendedReturnDays" BETWEEN 1 AND 730);
