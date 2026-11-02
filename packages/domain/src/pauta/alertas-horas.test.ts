import { describe, expect, it } from "vitest";

import {
  calcularAlertasHoras,
  LIMITE_MENSUAL,
  LIMITE_SEMANAL_HORAS,
  UMBRAL_AVISO_AMARILLO_SEMANAL_H,
} from "./alertas-horas";

describe("calcularAlertasHoras", () => {
  it("alerta crítica al superar el límite semanal (42 h, Ley 21.561)", () => {
    const turnos = Array.from({ length: 5 }, (_, i) => ({
      personaId: "p1",
      fecha: `2026-10-${String(i + 1).padStart(2, "0")}`,
      horaInicio: "08:00",
      horaFin: "20:00",
    }));
    const alertas = calcularAlertasHoras(turnos, "2026-10-01");
    const sem = alertas.find((a) => a.tipo === "semanal");
    expect(sem).toBeDefined();
    expect((sem!.horas ?? 0) > LIMITE_SEMANAL_HORAS).toBe(true);
    expect(sem!.severidad).toBe("critica");
  });

  it("alerta amarilla entre 40 h y el límite semanal (como 1.0)", () => {
    const turnos = Array.from({ length: 4 }, (_, i) => ({
      personaId: "p1",
      fecha: `2026-10-${String(i + 1).padStart(2, "0")}`,
      horaInicio: "08:00",
      horaFin: "18:15",
    }));
    const alertas = calcularAlertasHoras(turnos, "2026-10-01");
    const sem = alertas.find((a) => a.tipo === "semanal");
    expect(sem).toBeDefined();
    expect((sem!.horas ?? 0) > UMBRAL_AVISO_AMARILLO_SEMANAL_H).toBe(true);
    expect((sem!.horas ?? 0) <= LIMITE_SEMANAL_HORAS).toBe(true);
    expect(sem!.severidad).toBe("advertencia");
  });

  it("no alerta semanal en o bajo 40 h", () => {
    const turnos = Array.from({ length: 4 }, (_, i) => ({
      personaId: "p1",
      fecha: `2026-10-${String(i + 1).padStart(2, "0")}`,
      horaInicio: "08:00",
      horaFin: "18:00",
    }));
    const alertas = calcularAlertasHoras(turnos, "2026-10-01");
    expect(alertas.some((a) => a.tipo === "semanal")).toBe(false);
  });

  it("alerta descanso menor a 12 h", () => {
    const alertas = calcularAlertasHoras([
      { personaId: "p1", fecha: "2026-10-01", horaInicio: "08:00", horaFin: "20:00" },
      { personaId: "p1", fecha: "2026-10-02", horaInicio: "04:00", horaFin: "12:00" },
    ]);
    expect(alertas.some((a) => a.tipo === "descanso")).toBe(true);
  });

  it("no avisa mensual antes del límite", () => {
    const turnos = [{ personaId: "p1", fecha: "2026-10-15", horaInicio: "08:00", horaFin: "20:00" }];
    const alertas = calcularAlertasHoras(turnos, "2026-10-15");
    expect(alertas.filter((a) => a.tipo === "mensual" && (a.horas ?? 0) <= LIMITE_MENSUAL)).toHaveLength(0);
  });
});
