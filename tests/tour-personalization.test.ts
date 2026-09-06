import { describe, expect, it } from "vitest";
import { demoNextStatus, tourPersonalizationSchema } from "../lib/admin/tour-personalization";

const settings = { studioName: "Meu Studio", primaryColor: "#9A5B67", calendarSlotInterval: 10 };
describe("personalização guiada e demonstração", () => {
  it("aceita apenas preferências conhecidas", () => {
    expect(tourPersonalizationSchema.parse(settings)).toEqual(settings);
    expect(tourPersonalizationSchema.safeParse({ ...settings, organizationId: "foreign" }).success).toBe(false);
    expect(tourPersonalizationSchema.safeParse({ ...settings, primaryColor: "url(javascript:alert(1))" }).success).toBe(false);
    expect(tourPersonalizationSchema.safeParse({ ...settings, calendarSlotInterval: 7 }).success).toBe(false);
    expect(tourPersonalizationSchema.safeParse({ ...settings, studioName: " " }).success).toBe(false);
  });
  it("simula o ciclo agendar, confirmar e concluir", () => {
    const booked = demoNextStatus("free", "book");
    const confirmed = demoNextStatus(booked, "confirm");
    expect(demoNextStatus(confirmed, "complete")).toBe("completed");
  });
  it("cancelamento libera nova reserva e reiniciar limpa o estado", () => {
    expect(demoNextStatus("confirmed", "cancel")).toBe("cancelled");
    expect(demoNextStatus("cancelled", "book")).toBe("scheduled");
    expect(demoNextStatus("completed", "reset")).toBe("free");
  });
  it("ignora etapas inválidas e cliques repetidos", () => {
    expect(demoNextStatus("free", "complete")).toBe("free");
    expect(demoNextStatus("scheduled", "book")).toBe("scheduled");
    expect(demoNextStatus("completed", "cancel")).toBe("completed");
  });
});
