import { describe, expect, it } from "vitest";

import { formatearFechaHora } from "@opai/domain";
import { horaLocalCompleta, presentarHoraLocal } from "../lib/asistencia-hora-local";

describe("hora local de propuesta de corrección", () => {
  it("exige fecha y hora completas sin completar silenciosamente campos vacíos", () => {
    for (const valor of ["", "T", "2026-11-17T", "T12:34", "2026-11-17T12:"]) {
      expect(horaLocalCompleta(valor)).toBe(false);
    }
    expect(horaLocalCompleta("2026-11-17T00:05")).toBe(true);
  });
  it("mantiene la interpretación local de la fecha y hora seleccionadas", () => {
    const dia = "2026-11-17";
    const hora = "00:05";
    const valor = `${dia}T${hora}`;
    const fecha = new Date(valor);
    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(10);
    expect(fecha.getDate()).toBe(17);
    expect(fecha.getHours()).toBe(0);
    expect(fecha.getMinutes()).toBe(5);
    expect(presentarHoraLocal(fecha.toISOString())).toBe(
      formatearFechaHora(fecha.toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone, { segundos: true }),
    );
  });
});
