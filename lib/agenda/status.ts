import type { AppointmentStatus } from "@/app/generated/prisma/client";

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "ARRIVED",
  "IN_SERVICE",
];

export const FUTURE_VALID_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
];

export function isActiveAppointmentStatus(status: string) {
  return ACTIVE_APPOINTMENT_STATUSES.includes(status as AppointmentStatus);
}
