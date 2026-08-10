-- Expansão aditiva e compatível: a instalação legada passa a ser a primeira
-- organização. Execute somente depois de criar um backup verificável.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'RECEPTIONIST');
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE_BETA', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'MATCHED', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CLOSED');
CREATE TYPE "WaitlistPeriod" AS ENUM ('ANY', 'MORNING', 'AFTERNOON', 'EVENING');
CREATE TYPE "WaitlistOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID', 'VOID');
CREATE TYPE "DailyCloseStatus" AS ENUM ('OPEN', 'FINALIZED');
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELED');
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'VOID');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "segment" TEXT,
  "phone" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Identificador estável para o tenant que recebe todos os dados atuais.
INSERT INTO "Organization" ("id", "name", "slug", "timezone", "updatedAt")
VALUES ('cm9x2v7s60000u3l8xm3q4z9a', 'Emile Raduan Beauty Face', 'emile-raduan', 'America/Sao_Paulo', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE "OrganizationMembership" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'OWNER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");
CREATE INDEX "OrganizationMembership_userId_isActive_idx" ON "OrganizationMembership"("userId", "isActive");
CREATE INDEX "OrganizationMembership_organizationId_role_idx" ON "OrganizationMembership"("organizationId", "role");

-- Cada administrador atual torna-se OWNER do tenant legado, sem apagar ou
-- alterar suas sessões, senhas ou dados.
INSERT INTO "OrganizationMembership" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT concat('legacy-membership-', "id"), 'cm9x2v7s60000u3l8xm3q4z9a', "id", 'OWNER', CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("organizationId", "userId") DO NOTHING;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "Session_organizationId_expiresAt_idx" ON "Session"("organizationId", "expiresAt");

DO $$
DECLARE tenant_table TEXT;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'StudioSettings', 'ServiceCategory', 'Service', 'Client',
    'ClientHealthProfile', 'ClientNote', 'CalendarResource', 'Appointment',
    'ClientAccount', 'ClientPasswordResetToken', 'ClientSession',
    'ClientRecoveryRequest', 'BookingHold', 'AppointmentActionToken',
    'AppointmentEvent', 'AvailabilityRule', 'AvailabilityException',
    'ScheduleBlock', 'Holiday', 'Payment', 'PaymentEvent', 'MessageTemplate',
    'MessageLog', 'Document', 'Consent', 'PrivacyRequest', 'AuditLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "organizationId" TEXT', tenant_table);
    EXECUTE format('UPDATE %I SET "organizationId" = $1 WHERE "organizationId" IS NULL', tenant_table)
      USING 'cm9x2v7s60000u3l8xm3q4z9a';
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "organizationId" SET NOT NULL', tenant_table);
    BEGIN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE', tenant_table, tenant_table || '_organizationId_fkey');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

ALTER TABLE "CalendarResource" ADD COLUMN IF NOT EXISTS "membershipId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "assignedMembershipId" TEXT;

ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_name_key";
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_email_key";
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_cpf_key";
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_code_key";
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_requestKey_key";
ALTER TABLE "ClientAccount" DROP CONSTRAINT IF EXISTS "ClientAccount_email_key";
ALTER TABLE "Holiday" DROP CONSTRAINT IF EXISTS "Holiday_date_key";
ALTER TABLE "MessageTemplate" DROP CONSTRAINT IF EXISTS "MessageTemplate_name_key";
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_type_version_key";

CREATE UNIQUE INDEX IF NOT EXISTS "StudioSettings_organizationId_key" ON "StudioSettings"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCategory_organizationId_name_key" ON "ServiceCategory"("organizationId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Service_organizationId_name_key" ON "Service"("organizationId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_organizationId_email_key" ON "Client"("organizationId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_organizationId_cpf_key" ON "Client"("organizationId", "cpf");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_organizationId_code_key" ON "Appointment"("organizationId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_organizationId_requestKey_key" ON "Appointment"("organizationId", "requestKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientAccount_organizationId_email_key" ON "ClientAccount"("organizationId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "Holiday_organizationId_date_key" ON "Holiday"("organizationId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "MessageTemplate_organizationId_name_key" ON "MessageTemplate"("organizationId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Document_organizationId_type_version_key" ON "Document"("organizationId", "type", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilityRule_organizationId_resourceId_dayOfWeek_key" ON "AvailabilityRule"("organizationId", "resourceId", "dayOfWeek");
CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilityException_organizationId_resourceId_date_key" ON "AvailabilityException"("organizationId", "resourceId", "date");

CREATE INDEX IF NOT EXISTS "Service_organizationId_isActive_displayOrder_idx" ON "Service"("organizationId", "isActive", "displayOrder");
CREATE INDEX IF NOT EXISTS "Client_organizationId_fullName_idx" ON "Client"("organizationId", "fullName");
CREATE INDEX IF NOT EXISTS "CalendarResource_organizationId_isActive_idx" ON "CalendarResource"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "Appointment_organizationId_resourceId_startsAt_idx" ON "Appointment"("organizationId", "resourceId", "startsAt");
CREATE INDEX IF NOT EXISTS "Appointment_organizationId_clientId_startsAt_idx" ON "Appointment"("organizationId", "clientId", "startsAt");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_clientId_status_idx" ON "Payment"("organizationId", "clientId", "status");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_entityType_entityId_createdAt_idx" ON "AuditLog"("organizationId", "entityType", "entityId", "createdAt");

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "priceCents" INTEGER, "billingInterval" TEXT, "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "limits" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "planId" TEXT, "status" "SubscriptionStatus" NOT NULL DEFAULT 'FREE_BETA',
  "provider" TEXT, "providerCustomerId" TEXT, "providerSubscriptionId" TEXT, "currentPeriodEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");
CREATE UNIQUE INDEX "Subscription_provider_providerSubscriptionId_key" ON "Subscription"("provider", "providerSubscriptionId");
CREATE TABLE "OrganizationFeatureFlag" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "key" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationFeatureFlag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationFeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrganizationFeatureFlag_organizationId_key_key" ON "OrganizationFeatureFlag"("organizationId", "key");
CREATE TABLE "UserPasswordResetToken" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserPasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserPasswordResetToken_tokenHash_key" ON "UserPasswordResetToken"("tokenHash");
CREATE INDEX "UserPasswordResetToken_userId_expiresAt_idx" ON "UserPasswordResetToken"("userId", "expiresAt");
CREATE TABLE "UserEmailVerificationToken" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserEmailVerificationToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserEmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserEmailVerificationToken_tokenHash_key" ON "UserEmailVerificationToken"("tokenHash");
CREATE INDEX "UserEmailVerificationToken_userId_expiresAt_idx" ON "UserEmailVerificationToken"("userId", "expiresAt");

CREATE TABLE "WaitlistEntry" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "serviceId" TEXT NOT NULL,
  "preferredResourceId" TEXT, "preferredDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[], "preferredPeriod" "WaitlistPeriod" NOT NULL DEFAULT 'ANY',
  "earliestDate" DATE, "latestDate" DATE, "note" TEXT, "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "matchedAt" TIMESTAMP(3), "offeredAt" TIMESTAMP(3), "acceptedAt" TIMESTAMP(3), "closedAt" TIMESTAMP(3), "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WaitlistEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "WaitlistEntry_organizationId_status_serviceId_createdAt_idx" ON "WaitlistEntry"("organizationId", "status", "serviceId", "createdAt");
CREATE INDEX "WaitlistEntry_organizationId_clientId_status_idx" ON "WaitlistEntry"("organizationId", "clientId", "status");
CREATE TABLE "WaitlistOffer" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "waitlistEntryId" TEXT NOT NULL, "sourceAppointmentId" TEXT,
  "resourceId" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL, "occupiedFrom" TIMESTAMP(3) NOT NULL, "occupiedUntil" TIMESTAMP(3) NOT NULL,
  "tokenHash" TEXT NOT NULL, "status" "WaitlistOfferStatus" NOT NULL DEFAULT 'PENDING', "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAppointmentId" TEXT, "createdByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "WaitlistOffer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WaitlistOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WaitlistOffer_tokenHash_key" ON "WaitlistOffer"("tokenHash");
CREATE INDEX "WaitlistOffer_organizationId_status_expiresAt_idx" ON "WaitlistOffer"("organizationId", "status", "expiresAt");
CREATE INDEX "WaitlistOffer_organizationId_resourceId_startsAt_idx" ON "WaitlistOffer"("organizationId", "resourceId", "startsAt");
CREATE INDEX "WaitlistOffer_organizationId_waitlistEntryId_createdAt_idx" ON "WaitlistOffer"("organizationId", "waitlistEntryId", "createdAt");

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "category" TEXT NOT NULL, "description" TEXT NOT NULL, "amountCents" INTEGER NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL, "status" "ExpenseStatus" NOT NULL DEFAULT 'PAID', "paymentMethod" "PaymentMethod", "paidByMemberId" TEXT,
  "createdByUserId" TEXT, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"), CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Expense_organizationId_occurredAt_idx" ON "Expense"("organizationId", "occurredAt");
CREATE INDEX "Expense_organizationId_status_occurredAt_idx" ON "Expense"("organizationId", "status", "occurredAt");
CREATE TABLE "DailyCashClose" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "date" DATE NOT NULL, "status" "DailyCloseStatus" NOT NULL DEFAULT 'OPEN',
  "expectedCents" INTEGER NOT NULL DEFAULT 0, "actualCents" INTEGER, "differenceCents" INTEGER, "note" TEXT, "closedByUserId" TEXT, "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyCashClose_pkey" PRIMARY KEY ("id"), CONSTRAINT "DailyCashClose_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DailyCashClose_organizationId_date_key" ON "DailyCashClose"("organizationId", "date");
CREATE TABLE "ServicePackage" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "totalSessions" INTEGER NOT NULL, "remainingSessions" INTEGER NOT NULL, "priceCents" INTEGER, "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3), "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE', "createdByUserId" TEXT, "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id"), CONSTRAINT "ServicePackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServicePackage_sessions_check" CHECK ("totalSessions" > 0 AND "remainingSessions" >= 0 AND "remainingSessions" <= "totalSessions")
);
CREATE INDEX "ServicePackage_organizationId_clientId_serviceId_status_idx" ON "ServicePackage"("organizationId", "clientId", "serviceId", "status");
CREATE TABLE "PackageRedemption" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "servicePackageId" TEXT NOT NULL, "appointmentId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL, "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdByUserId" TEXT,
  CONSTRAINT "PackageRedemption_pkey" PRIMARY KEY ("id"), CONSTRAINT "PackageRedemption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PackageRedemption_appointmentId_key" ON "PackageRedemption"("appointmentId");
CREATE INDEX "PackageRedemption_organizationId_servicePackageId_redeemedAt_idx" ON "PackageRedemption"("organizationId", "servicePackageId", "redeemedAt");
CREATE TABLE "CommissionRule" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "membershipId" TEXT, "serviceId" TEXT, "commissionType" "CommissionType" NOT NULL,
  "value" INTEGER NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id"), CONSTRAINT "CommissionRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommissionRule_value_check" CHECK ("value" >= 0)
);
CREATE INDEX "CommissionRule_organizationId_membershipId_serviceId_isActive_idx" ON "CommissionRule"("organizationId", "membershipId", "serviceId", "isActive");
CREATE TABLE "CommissionEntry" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "appointmentId" TEXT NOT NULL, "membershipId" TEXT NOT NULL, "serviceId" TEXT NOT NULL,
  "baseAmountCents" INTEGER NOT NULL, "amountCents" INTEGER NOT NULL, "ruleId" TEXT, "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paidAt" TIMESTAMP(3), "paidByUserId" TEXT,
  CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id"), CONSTRAINT "CommissionEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommissionEntry_appointmentId_key" ON "CommissionEntry"("appointmentId");
CREATE INDEX "CommissionEntry_organizationId_membershipId_status_generatedAt_idx" ON "CommissionEntry"("organizationId", "membershipId", "status", "generatedAt");

INSERT INTO "Subscription" ("id", "organizationId", "status", "updatedAt")
VALUES ('cm9x2v7s60001u3l8xm3q4z9a', 'cm9x2v7s60000u3l8xm3q4z9a', 'FREE_BETA', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
