import { describe, expect, it } from "vitest";

import { enFranjaNocturna, minutosEnZona, parseHoraLocal } from "./horario";

describe("franja nocturna", () => {
  it("parsea horas locales", () => {
    expect(parseHoraLocal("20:00")).toBe(20 * 60);
    expect(parseHoraLocal("08:30")).toBe(8 * 60 + 30);
    expect(parseHoraLocal("25:00")).toBeNull();
  });

  it("20:00–08:00 cruza medianoche en UTC", () => {
    expect(enFranjaNocturna(new Date("2026-01-10T21:00:00.000Z"), "20:00", "08:00", "UTC")).toBe(true);
    expect(enFranjaNocturna(new Date("2026-01-10T10:00:00.000Z"), "20:00", "08:00", "UTC")).toBe(false);
    expect(enFranjaNocturna(new Date("2026-01-10T05:00:00.000Z"), "20:00", "08:00", "UTC")).toBe(true);
  });

  it("franja diurna simple en UTC", () => {
    expect(enFranjaNocturna(new Date("2026-01-10T12:00:00.000Z"), "09:00", "18:00", "UTC")).toBe(true);
    expect(enFranjaNocturna(new Date("2026-01-10T20:00:00.000Z"), "09:00", "18:00", "UTC")).toBe(false);
    expect(minutosEnZona(new Date("2026-01-10T12:30:00.000Z"), "UTC")).toBe(12 * 60 + 30);
  });
});