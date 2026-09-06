import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ origin: vi.fn(), owner: vi.fn(), settings: vi.fn(), audit: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ assertSameOrigin: mocks.origin, requireOwner: mocks.owner }));
vi.mock("@/lib/admin/tour", () => ({ recordAdminTourSeen: vi.fn() }));
vi.mock("@/lib/tenancy/context", () => ({ requireTenantContext: async () => ({ organizationId: "trusted-tenant" }) }));
vi.mock("@/lib/admin/tour-personalization", async () => import("../lib/admin/tour-personalization"));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/db/prisma", () => {
  const tx = { studioSettings: { upsert: mocks.settings }, auditLog: { create: mocks.audit } };
  return { getPrisma: () => ({ $transaction: (callback: (value: typeof tx) => Promise<void>) => callback(tx) }) };
});
import { saveTourPersonalizationAction } from "../app/admin/(private)/tour-actions";
const preferences = { studioName: "Meu negócio", primaryColor: "#2563A6", calendarSlotInterval: 15 };
describe("gravação segura do tutorial", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.owner.mockResolvedValue({ id: "owner" }); });
  it("usa tenant autenticado e grava somente as preferências", async () => {
    expect(await saveTourPersonalizationAction(preferences)).toEqual({ saved: true });
    expect(mocks.settings).toHaveBeenCalledWith({ where: { organizationId: "trusted-tenant" }, create: preferences, update: preferences });
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("recusa tentativa de escolher outro tenant", async () => {
    expect((await saveTourPersonalizationAction({ ...preferences, organizationId: "foreign" })).saved).toBe(false);
    expect(mocks.settings).not.toHaveBeenCalled();
  });
  it("recusa usuário sem permissão antes de escrever", async () => {
    mocks.owner.mockRejectedValue(new Error("forbidden"));
    await expect(saveTourPersonalizationAction(preferences)).rejects.toThrow("forbidden");
    expect(mocks.settings).not.toHaveBeenCalled();
  });
  it("recusa origem inválida", async () => {
    mocks.origin.mockRejectedValue(new Error("origin"));
    await expect(saveTourPersonalizationAction(preferences)).rejects.toThrow("origin");
    expect(mocks.settings).not.toHaveBeenCalled();
  });
  it("não revela erro do banco nem confirma gravação que falhou", async () => {
    mocks.settings.mockRejectedValue(new Error("private SQL details"));
    const result = await saveTourPersonalizationAction(preferences);
    expect(result.saved).toBe(false); expect(result.error).not.toContain("SQL");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
