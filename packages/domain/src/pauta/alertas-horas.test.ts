import { describe, expect, it } from "vitest";

import { calcularAlertasHoras, LIMITE_MENSUAL, LIMITE_SEMANAL_HORAS } from "./alertas-horas";

describe("calcularAlertasHoras", () => {
  it("alerta al superar el límite semanal", () => {
    const turnos = Array.from({ length: 5 }, (_, i) => ({
      personaId: "p1",
      fecha: `2026-10-${String(i + 1).padStart(2, "0")}`,
      horaInicio: "08:00",
      horaFin: "20:00",
    }));
    const alertas = calcularAlertasHoras(turnos, "2026-10-01");
    expect(alertas.some((a) => a.tipo === "semanal" && (a.horas ?? 0) > LIMITE_SEMANAL_HORAS)).toBe(true);
  });

  it("alerta descanso menor a 12 h", () => {
    const alertas = calcularAlertasHoras([
      { personaId: "p1", fecha: "2026-10-01", horaInicio: "08:00", horaFin: "20:00" },
      { personaId: "p1", fecha: "2026-10-02", horaInicio: "04:00", horaFin: "12:00" },
    ]);
    expect(alertas.some((a) => a.tipo === "descanso")).toBe(true);
  });

  it("con umbral 0 no avisa antes del límite mensual", () => {
    const turnos = [{ personaId: "p1", fecha: "2026-10-15", horaInicio: "08:00", horaFin: "20:00" }];
    const alertas = calcularAlertasHoras(turnos, "2026-10-15");
    expect(alertas.filter((a) => a.tipo === "mensual" && (a.horas ?? 0) <= LIMITE_MENSUAL)).toHaveLength(0);
  });
});
