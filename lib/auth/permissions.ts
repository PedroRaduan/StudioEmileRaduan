export type StaffRole = "OWNER" | "ADMIN" | "STAFF" | "RECEPTIONIST";
export type Permission =
  | "APPOINTMENTS_MANAGE"
  | "CLIENTS_MANAGE"
  | "PAYMENTS_RECORD"
  | "SERVICES_MANAGE"
  | "SETTINGS_MANAGE"
  | "REPORTS_VIEW"
  | "STAFF_MANAGE"
  | "SENSITIVE_CLIENT_VIEW"
  | "EXPORT_DATA"
  | "FINANCE_VIEW"
  | "FINANCE_MANAGE"
  | "FINANCE_CLOSE"
  | "COMMISSIONS_VIEW"
  | "WAITLIST_MANAGE";

const permissionsByRole: Record<Exclude<StaffRole, "OWNER" | "ADMIN">, ReadonlySet<Permission>> = {
  STAFF: new Set(["APPOINTMENTS_MANAGE", "CLIENTS_MANAGE", "PAYMENTS_RECORD", "WAITLIST_MANAGE"]),
  RECEPTIONIST: new Set(["APPOINTMENTS_MANAGE", "CLIENTS_MANAGE", "PAYMENTS_RECORD", "WAITLIST_MANAGE"]),
};

export function can(role: StaffRole, permission: Permission) {
  return role === "OWNER" || role === "ADMIN" || permissionsByRole[role].has(permission);
}
