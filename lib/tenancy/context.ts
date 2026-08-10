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

/**
 * O layout e seus filhos podem ser renderizados em cadeias assíncronas
 * independentes pelos Server Components. Por isso, um `enterWith` feito no
 * layout não pode ser a única fonte do tenant para uma query filha.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const context = getTenantContext();
  if (context) return context;

  // A importação dinâmica evita um ciclo estático: a autenticação consulta o
  // Prisma de sistema, que não aplica o escopo tenantizado.
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) throw new MissingTenantContextError();

  return {
    organizationId: user.organizationId,
    membershipId: user.membershipId,
    role: user.role,
  };
}

export async function runWithTenant<T>(context: TenantContext, operation: () => T | Promise<T>): Promise<T> {
  // PrismaPromise é lazy: garantir o await dentro do storage evita perder o
  // contexto antes de a operação realmente começar.
  return storage.run(context, async () => await operation());
}
