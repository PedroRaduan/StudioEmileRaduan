import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ expense: vi.fn(), servicePackage: vi.fn(), audit: vi.fn(), client: vi.fn(), service: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/app/generated/prisma/client", () => ({ Prisma: {} }));
vi.mock("@/lib/admin/finance-calculations", async () => import("../lib/admin/finance-calculations"));
vi.mock("@/lib/date-time", async () => import("../lib/date-time"));
vi.mock("@/lib/tenancy/context", () => ({ requireTenantContext: async () => ({ organizationId: "org-a" }) }));
vi.mock("@/lib/db/prisma", () => {
  const tx = { expense: { create: mocks.expense }, servicePackage: { create: mocks.servicePackage }, auditLog: { create: mocks.audit }, client: { findFirst: mocks.client }, service: { findFirst: mocks.service } };
  return { getPrisma: () => ({ ...tx, $transaction: (operation: (value: typeof tx) => Promise<unknown>) => operation(tx) }) };
});
import { createExpense, createServicePackage } from "../lib/admin/finance";

describe("gravação de despesas e pacotes", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.expense.mockResolvedValue({ id: "expense", amountCents: 2900, category: "Estoque" });
    mocks.servicePackage.mockResolvedValue({ id: "package", totalSessions: 4 });
    mocks.client.mockResolvedValue({ id: "client" }); mocks.service.mockResolvedValue({ id: "service" });
  });
  it("grava o autor da despesa usando o campo do schema", async () => {
    await createExpense({ actorUserId: "owner", amountCents: 2900, category: "Estoque", description: "Material", occurredAt: new Date() });
    const { data } = mocks.expense.mock.calls[0][0];
    expect(data.createdByUserId).toBe("owner"); expect(data.organizationId).toBe("org-a"); expect(data).not.toHaveProperty("actorUserId");
  });
  it("grava o autor do pacote sem enviar campos desconhecidos ao Prisma", async () => {
    await createServicePackage({ actorUserId: "owner", clientId: "client", serviceId: "service", name: "Sessões", totalSessions: 4 });
    const { data } = mocks.servicePackage.mock.calls[0][0];
    expect(data.createdByUserId).toBe("owner"); expect(data.remainingSessions).toBe(4); expect(data).not.toHaveProperty("actorUserId");
  });
  it("recusa pacote quando a consulta tenantizada não encontra o cliente", async () => {
    mocks.client.mockResolvedValue(null);
    await expect(createServicePackage({ actorUserId: "owner", clientId: "foreign", serviceId: "service", name: "Sessões", totalSessions: 4 })).rejects.toThrow();
    expect(mocks.servicePackage).not.toHaveBeenCalled();
  });
});
