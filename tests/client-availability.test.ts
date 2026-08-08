import { describe, expect, it } from "vitest";
import { generateAvailableSlots } from "../lib/client-booking/slot-rules";

const base = {
  date: "2026-08-10",
  timezone: "America/Sao_Paulo",
  now: new Date("2026-08-09T12:00:00.000Z"),
  startMinute: 9 * 60,
  endMinute: 12 * 60,
  lunchStart: null,
  lunchEnd: null,
  slotMinutes: 30,
  durationMinutes: 60,
  preparationMinutes: 0,
  cleanupMinutes: 0,
  minimumNoticeHours: 0,
  maximumAdvanceDays: 90,
  busy: [],
};

describe("disponibilidade da cliente", () => {
  it("gera somente inícios que terminam dentro do expediente", () => {
    expect(generateAvailableSlots(base).map((slot) => slot.time)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("remove serviços que atravessam o intervalo", () => {
    const slots = generateAvailableSlots({ ...base, lunchStart: 10 * 60 + 30, lunchEnd: 11 * 60 + 30 });
    expect(slots.map((slot) => slot.time)).toEqual(["09:00", "09:30"]);
  });

  it("considera preparação e intervalo posterior ao comparar conflitos", () => {
    const busyStart = new Date("2026-08-10T13:30:00.000Z"); // 10:30 em São Paulo
    const slots = generateAvailableSlots({ ...base, preparationMinutes: 15, cleanupMinutes: 15, busy: [{ startsAt: busyStart, endsAt: new Date(busyStart.getTime() + 30 * 60_000) }] });
    expect(slots.map((slot) => slot.time)).not.toContain("10:00");
    expect(slots.map((slot) => slot.time)).not.toContain("10:30");
  });

  it("respeita a antecedência mínima", () => {
    const slots = generateAvailableSlots({ ...base, now: new Date("2026-08-10T12:00:00.000Z"), minimumNoticeHours: 2 });
    expect(slots.map((slot) => slot.time)).toEqual(["11:00"]);
  });
});
