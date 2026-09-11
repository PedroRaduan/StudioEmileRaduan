import { beforeEach, describe, expect, it, vi } from "vitest";
import { agendaDateRange, shiftAgendaDate } from "../lib/agenda/navigation";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), settings: vi.fn(), appointments: vi.fn(), resources: vi.fn(), blocks: vi.fn(), holiday: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requirePermission: mocks.permission }));
vi.mock("@/lib/tenancy/context", () => ({ requireTenantContext: async () => ({ organizationId: "org-a" }) }));
vi.mock("@/lib/date-time", async () => import("../lib/date-time"));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => ({
  studioSettings: { findUnique: mocks.settings }, appointment: { findMany: mocks.appointments },
  calendarResource: { findMany: mocks.resources }, scheduleBlock: { findMany: mocks.blocks }, holiday: { findFirst: mocks.holiday },
}) }));
import { getAgendaForDay, getAgendaForRange } from "../lib/admin/agenda";

describe("consulta dos agendamentos anteriores", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mocks.settings.mockResolvedValue({ timezone: "America/Sao_Paulo", calendarSlotInterval: 10 });
    mocks.appointments.mockResolvedValue([]); mocks.resources.mockResolvedValue([]); mocks.blocks.mockResolvedValue([]);
  });
  it("abre 30 dias passados e navega sem buracos entre períodos", () => {
    expect(agendaDateRange("2026-09-10", "history")).toEqual({ start: "2026-08-12", end: "2026-09-10" });
    const previous = shiftAgendaDate("2026-09-10", "history", -1);
    expect(agendaDateRange(previous, "history")).toEqual({ start: "2026-07-13", end: "2026-08-11" });
    expect(agendaDateRange("2026-09-10", "list")).toEqual({ start: "2026-09-10", end: "2026-10-09" });
  });
  it("não limita a leitura do passado por hoje ou por status", async () => {
    await getAgendaForRange("2025-01-01", "2025-01-31");
    expect(mocks.appointments.mock.calls[0][0].where).toEqual({ startsAt: { gte: new Date("2025-01-01T03:00:00Z"), lt: new Date("2025-02-01T03:00:00Z") } });
  });
  it("inclui horários iniciados antes da meia-noite e ainda em andamento no dia selecionado", async () => {
    await getAgendaForDay("2025-01-01");
    expect(mocks.appointments.mock.calls[0][0].where).toEqual({ startsAt: { lt: new Date("2025-01-02T03:00:00Z") }, endsAt: { gt: new Date("2025-01-01T03:00:00Z") } });
  });
  it("busca também agendas desativadas com registros da empresa naquele dia", async () => {
    await getAgendaForDay("2025-01-01");
    const filters = mocks.resources.mock.calls[0][0].where.OR;
    expect(filters[0]).toEqual({ isActive: true });
    expect(filters[1].appointments.some.organizationId).toBe("org-a");
    expect(filters[2].blocks.some.organizationId).toBe("org-a");
    expect(filters[1].appointments.some.startsAt.lt).toEqual(new Date("2025-01-02T03:00:00Z"));
  });
  it("exige autorização também para consultas históricas", async () => {
    mocks.permission.mockRejectedValue(new Error("forbidden"));
    await expect(getAgendaForDay("2025-01-01")).rejects.toThrow("forbidden");
    expect(mocks.appointments).not.toHaveBeenCalled();
  });
});
