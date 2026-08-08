CREATE TYPE "AdminAgreementType" AS ENUM ('TERMS', 'PRIVACY', 'TEMPORARY_ACCESS');

ALTER TABLE "User"
  ADD COLUMN "isTemporary" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AdminAgreement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AdminAgreementType" NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "AdminAgreement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAgreement_userId_type_acceptedAt_idx" ON "AdminAgreement"("userId", "type", "acceptedAt");

ALTER TABLE "AdminAgreement"
  ADD CONSTRAINT "AdminAgreement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
