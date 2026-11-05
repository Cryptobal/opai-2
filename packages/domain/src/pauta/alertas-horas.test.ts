import { describe, expect, it } from "vitest";

import { LIMITE_MENSUAL_HORAS_DEFECTO as LIMITE_MENSUAL, limiteSemanalEn } from "../jornada-legal";
import { calcularAlertasHoras } from "./alertas-horas";

const LIMITE_SEMANAL_HORAS = limiteSemanalEn("2026-10-01");
const UMBRAL_AVISO_AMARILLO_SEMANAL_H = LIMITE_SEMANAL_HORAS - 2;

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

  it("usa el tope vigente según la fecha, no 42 fijo", () => {
    // Lunes 5-oct-2026 y lunes 2-oct-2028.
    const semana = (lunes: string) =>
      Array.from({ length: 4 }, (_, i) => ({
        personaId: "p1",
        fecha: `${lunes.slice(0, 8)}${String(Number(lunes.slice(8)) + i).padStart(2, "0")}`,
        horaInicio: "08:00",
        horaFin: "18:30",
      }));
    // 4 × 10,5 h = 42 h: bajo el tope de 2026 (42, solo aviso) y sobre el de 2028 (40, crítica).
    const en2026 = calcularAlertasHoras(semana("2026-10-05"), "2026-10-05").find((a) => a.tipo === "semanal");
    const en2028 = calcularAlertasHoras(semana("2028-10-02"), "2028-10-02").find((a) => a.tipo === "semanal");
    expect(en2026?.severidad).toBe("advertencia");
    expect(en2026?.limite).toBe(42);
    expect(en2028?.severidad).toBe("critica");
    expect(en2028?.limite).toBe(40);
  });

  it("acepta vigencias de la empresa y ajustes de mensual y descanso", () => {
    const turnos = [
      { personaId: "p1", fecha: "2026-10-01", horaInicio: "08:00", horaFin: "20:00" },
      { personaId: "p1", fecha: "2026-10-02", horaInicio: "08:00", horaFin: "20:00" },
    ];
    const r = calcularAlertasHoras(turnos, "2026-10-01", {
      vigencias: [{ desde: "2026-01-01", horas: 20 }],
      limiteMensualHoras: 10,
      descansoMinimoHoras: 13,
    });
    expect(r.find((a) => a.tipo === "semanal")?.limite).toBe(20);
    expect(r.find((a) => a.tipo === "mensual")?.limite).toBe(10);
    expect(r.find((a) => a.tipo === "descanso")).toBeDefined();
  });
});
