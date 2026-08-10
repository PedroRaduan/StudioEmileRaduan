import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tenantContext = readFileSync(new URL("../lib/tenancy/context.ts", import.meta.url), "utf8");
const tenantPrisma = readFileSync(new URL("../lib/db/prisma.ts", import.meta.url), "utf8");
const session = readFileSync(new URL("../lib/auth/session.ts", import.meta.url), "utf8");

describe("resolução do contexto tenantizado", () => {
  it("resolve o tenant autenticado quando a cadeia assíncrona do Server Component não o preserva", () => {
    expect(tenantContext).toContain('const { getCurrentUser } = await import("@/lib/auth/session")');
    expect(tenantContext).toContain("const user = await getCurrentUser()");
    expect(tenantContext).toContain("if (!user) throw new MissingTenantContextError()");
  });

  it("aplica o escopo recuperado em toda operação de modelo privado", () => {
    expect(tenantPrisma).toContain("const context = await requireTenantContext()");
    expect(tenantPrisma).toContain("runWithTenant(context, () => query(scopeTenantQuery(args, operation, context.organizationId)");
  });

  it("não depende mais de um enterWith feito por requireStaff", () => {
    expect(session).not.toContain("activateTenant(");
  });
});
