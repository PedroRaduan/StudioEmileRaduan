import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => ({ auditLog: { findFirst: mocks.findFirst, create: mocks.create } }) }));
import { hasSeenAdminTour, recordAdminTourSeen } from "../lib/admin/tour";

describe("tutorial de primeira abertura", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireStaff.mockResolvedValue({ id: "user-a", membershipId: "member-a", organizationId: "org-a" });
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "seen" });
  });
  it("mostra para um membro novo e usa o membro autenticado para persistir a exibição", async () => {
    expect(await hasSeenAdminTour()).toBe(false);
    await recordAdminTourSeen();
    expect(mocks.create).toHaveBeenCalledWith({
      data: { userId: "user-a", action: "ADMIN_TOUR_PRESENTED", entityType: "OrganizationMembership", entityId: "member-a" },
      select: { id: true },
    });
  });
  it("não reapresenta nem grava de novo quando a exibição já está registrada", async () => {
    mocks.findFirst.mockResolvedValue({ id: "seen" });
    expect(await hasSeenAdminTour()).toBe(true);
    await recordAdminTourSeen();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("não reutiliza a preferência de outro membro ou organização", async () => {
    mocks.requireStaff.mockResolvedValue({ id: "user-b", membershipId: "member-b", organizationId: "org-b" });
    await hasSeenAdminTour();
    expect(mocks.findFirst.mock.calls[0][0].where).toMatchObject({ userId: "user-b", entityId: "member-b" });
  });
  it("não consulta nem grava sem autenticação", async () => {
    mocks.requireStaff.mockRejectedValue(new Error("unauthenticated"));
    await expect(recordAdminTourSeen()).rejects.toThrow("unauthenticated");
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
