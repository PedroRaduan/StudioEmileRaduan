ALTER TABLE "StudioSettings"
ADD COLUMN "calendarSlotInterval" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "StudioSettings"
ADD CONSTRAINT "StudioSettings_calendarSlotInterval_check"
CHECK ("calendarSlotInterval" IN (5, 10, 15, 30));
