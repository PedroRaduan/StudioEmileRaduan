import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export class MissingTenantContextError extends Error {
  constructor() {
    super("A operação solicitada não possui uma organização ativa.");
    this.name = "MissingTenantContextError";
  }
}

export type TenantContext = {
  organizationId: string;
  membershipId: string;
  role: "OWNER" | "ADMIN" | "STAFF" | "RECEPTIONIST";
};

const storage = new AsyncLocalStorage<TenantContext>();

export function activateTenant(context: TenantContext) {
  storage.enterWith(context);
}

export function getTenantContext() {
  return storage.getStore();
}

export function requireTenantContext() {
  const context = getTenantContext();
  if (!context) throw new MissingTenantContextError();
  return context;
}

export function runWithTenant<T>(context: TenantContext, operation: () => Promise<T>) {
  return storage.run(context, operation);
}
