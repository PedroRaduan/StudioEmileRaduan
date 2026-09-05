import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
  settings: vi.fn(), expenses: vi.fn(), payments: vi.fn(), expenseTotal: vi.fn(), commissionTotal: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/app/generated/prisma/client", () => ({ Prisma: {} }));
vi.mock("@/lib/tenancy/context", () => ({ requireTenantContext: mocks.requireTenantContext }));
vi.mock("@/lib/admin/finance-calculations", async () => import("../lib/admin/finance-calculations"));
vi.mock("@/lib/date-time", async () => import("../lib/date-time"));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => ({
  studioSettings: { findUnique: mocks.settings },
  expense: { findMany: mocks.expenses, aggregate: mocks.expenseTotal },
  payment: { findMany: mocks.payments },
  commissionEntry: { aggregate: mocks.commissionTotal },
}) }));
import { getFinancialOverview } from "../lib/admin/finance";

describe("resumo financeiro", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T01:00:00Z"));
    mocks.requireTenantContext.mockResolvedValue({ organizationId: "org-a" });
    mocks.settings.mockResolvedValue({ timezone: "America/Sao_Paulo" });
    mocks.expenses.mockResolvedValue([{ amountCents: 100 }]);
    mocks.payments.mockResolvedValue([{ amountPaidCents: 9990 }, { amountPaidCents: 500 }]);
    mocks.expenseTotal.mockResolvedValue({ _sum: { amountCents: 4000 } });
    mocks.commissionTotal.mockResolvedValue({ _sum: { amountCents: 21000 } });
  });
  afterEach(() => vi.useRealTimers());
  it("usa os totais completos, independentemente da quantidade exibida na lista", async () => {
    const result = await getFinancialOverview();
    expect(result.todayExpenses).toBe(4000);
    expect(result.pendingCommissionCents).toBe(21000);
    expect(result.todayRevenue).toBe(10490);
  });
  it("mantém o dia da empresa quando a data UTC já virou", async () => {
    const result = await getFinancialOverview();
    expect(result.today).toBe("2026-09-05");
    expect(mocks.payments.mock.calls[0][0].where.confirmedAt).toEqual({
      gte: new Date("2026-09-05T03:00:00Z"), lt: new Date("2026-09-06T03:00:00Z"),
    });
  });
  it("apresenta zero quando não há despesas nem comissões", async () => {
    mocks.expenseTotal.mockResolvedValue({ _sum: { amountCents: null } });
    mocks.commissionTotal.mockResolvedValue({ _sum: { amountCents: null } });
    const result = await getFinancialOverview();
    expect(result.todayExpenses).toBe(0);
    expect(result.pendingCommissionCents).toBe(0);
  });
  it("recusa acesso sem contexto de empresa antes de consultar valores", async () => {
    mocks.requireTenantContext.mockRejectedValue(new Error("missing tenant"));
    await expect(getFinancialOverview()).rejects.toThrow("missing tenant");
    expect(mocks.payments).not.toHaveBeenCalled();
  });
});
