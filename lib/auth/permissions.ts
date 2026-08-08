export type StaffRole = "OWNER" | "RECEPTIONIST";
export type Permission =
  | "APPOINTMENTS_MANAGE"
  | "CLIENTS_MANAGE"
  | "PAYMENTS_RECORD"
  | "SERVICES_MANAGE"
  | "SETTINGS_MANAGE"
  | "REPORTS_VIEW"
  | "STAFF_MANAGE"
  | "SENSITIVE_CLIENT_VIEW"
  | "EXPORT_DATA";

const receptionistPermissions = new Set<Permission>(["APPOINTMENTS_MANAGE", "CLIENTS_MANAGE", "PAYMENTS_RECORD"]);

export function can(role: StaffRole, permission: Permission) {
  return role === "OWNER" || receptionistPermissions.has(permission);
}
