CREATE TYPE "BookingHoldStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'RELEASED', 'EXPIRED');
CREATE TYPE "AppointmentActionPurpose" AS ENUM ('CONFIRM', 'CANCEL', 'RESCHEDULE');
CREATE TYPE "RecoveryRequestStatus" AS ENUM ('OPEN', 'CONTACTED', 'RESOLVED');

ALTER TABLE "StudioSettings"
  ADD COLUMN "bookingHoldMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "cancellationHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "rescheduleHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "maxClientReschedules" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_createdByUserId_fkey";
ALTER TABLE "Appointment" ALTER COLUMN "createdByUserId" DROP NOT NULL;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ClientAccount" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "verifiedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientPasswordResetToken" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientRecoveryRequest" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "status" "RecoveryRequestStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ClientRecoveryRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingHold" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "clientId" TEXT,
  "serviceId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "occupiedFrom" TIMESTAMP(3) NOT NULL,
  "occupiedUntil" TIMESTAMP(3) NOT NULL,
  "status" "BookingHoldStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingHold_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentActionToken" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "purpose" "AppointmentActionPurpose" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentActionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientAccount_clientId_key" ON "ClientAccount"("clientId");
CREATE UNIQUE INDEX "ClientAccount_email_key" ON "ClientAccount"("email");
CREATE INDEX "ClientAccount_isActive_createdAt_idx" ON "ClientAccount"("isActive", "createdAt");
CREATE UNIQUE INDEX "ClientSession_tokenHash_key" ON "ClientSession"("tokenHash");
CREATE INDEX "ClientSession_accountId_expiresAt_idx" ON "ClientSession"("accountId", "expiresAt");
CREATE UNIQUE INDEX "ClientPasswordResetToken_tokenHash_key" ON "ClientPasswordResetToken"("tokenHash");
CREATE INDEX "ClientPasswordResetToken_accountId_expiresAt_idx" ON "ClientPasswordResetToken"("accountId", "expiresAt");
CREATE INDEX "ClientRecoveryRequest_status_createdAt_idx" ON "ClientRecoveryRequest"("status", "createdAt");
CREATE INDEX "ClientRecoveryRequest_clientId_createdAt_idx" ON "ClientRecoveryRequest"("clientId", "createdAt");
CREATE UNIQUE INDEX "BookingHold_tokenHash_key" ON "BookingHold"("tokenHash");
CREATE INDEX "BookingHold_resourceId_startsAt_idx" ON "BookingHold"("resourceId", "startsAt");
CREATE INDEX "BookingHold_status_expiresAt_idx" ON "BookingHold"("status", "expiresAt");
CREATE UNIQUE INDEX "AppointmentActionToken_tokenHash_key" ON "AppointmentActionToken"("tokenHash");
CREATE INDEX "AppointmentActionToken_appointmentId_purpose_expiresAt_idx" ON "AppointmentActionToken"("appointmentId", "purpose", "expiresAt");

ALTER TABLE "ClientAccount" ADD CONSTRAINT "ClientAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientPasswordResetToken" ADD CONSTRAINT "ClientPasswordResetToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientRecoveryRequest" ADD CONSTRAINT "ClientRecoveryRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingHold" ADD CONSTRAINT "BookingHold_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingHold" ADD CONSTRAINT "BookingHold_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingHold" ADD CONSTRAINT "BookingHold_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentActionToken" ADD CONSTRAINT "AppointmentActionToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingHold"
  ADD COLUMN "occupiedRange" tsrange
  GENERATED ALWAYS AS (tsrange("occupiedFrom", "occupiedUntil", '[)')) STORED;

ALTER TABLE "BookingHold"
  ADD CONSTRAINT "BookingHold_active_occupancy_excl"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    "occupiedRange" WITH &&
  ) WHERE ("status" = 'ACTIVE');
