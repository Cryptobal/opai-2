import { describe, expect, it } from "vitest";

import {
  calcularPlazo,
  esTerminalIncidente,
  esTerminalSolicitud,
  produceExportacion,
  puedeAvanzarIncidente,
  puedeAvanzarSolicitud,
  semaforoPlazo,
} from "./cumplimiento";

describe("plazo de la solicitud (§16.3)", () => {
  const recibida = new Date("2026-12-01T12:00:00.000Z");

  it("sin días configurados no hay plazo (Claude no inventa el valor legal)", () => {
    expect(calcularPlazo(recibida, null)).toBeNull();
    expect(calcularPlazo(recibida, 0)).toBeNull();
    expect(calcularPlazo(recibida, -5)).toBeNull();
  });

  it("con N días corridos, el plazo es recibida + N días", () => {
    expect(calcularPlazo(recibida, 20)?.toISOString()).toBe("2026-12-21T12:00:00.000Z");
    expect(calcularPlazo(recibida, 1.9)?.toISOString()).toBe("2026-12-02T12:00:00.000Z");
  });
});

describe("semáforo del plazo", () => {
  const plazo = new Date("2026-12-21T12:00:00.000Z");

  it("clasifica sin_plazo, vigente, por_vencer y vencido", () => {
    expect(semaforoPlazo(null, plazo)).toBe("sin_plazo");
    expect(semaforoPlazo(plazo, new Date("2026-12-10T12:00:00.000Z"))).toBe("vigente");
    expect(semaforoPlazo(plazo, new Date("2026-12-19T12:00:00.000Z"))).toBe("por_vencer");
    expect(semaforoPlazo(plazo, new Date("2026-12-22T12:00:00.000Z"))).toBe("vencido");
  });
});

describe("máquina de estado de la solicitud", () => {
  it("permite las transiciones del flujo y marca las terminales", () => {
    expect(puedeAvanzarSolicitud("recibida", "en_proceso")).toBe(true);
    expect(puedeAvanzarSolicitud("en_proceso", "resuelta")).toBe(true);
    expect(puedeAvanzarSolicitud("recibida", "rechazada")).toBe(true);
    expect(esTerminalSolicitud("resuelta")).toBe(true);
    expect(esTerminalSolicitud("rechazada")).toBe(true);
    expect(esTerminalSolicitud("recibida")).toBe(false);
  });

  it("rechaza retroceder o salir de un estado terminal", () => {
    expect(puedeAvanzarSolicitud("en_proceso", "recibida")).toBe(false);
    expect(puedeAvanzarSolicitud("resuelta", "en_proceso")).toBe(false);
    expect(puedeAvanzarSolicitud("rechazada", "resuelta")).toBe(false);
  });

  it("acceso y portabilidad producen exportación; el resto no", () => {
    expect(produceExportacion("acceso")).toBe(true);
    expect(produceExportacion("portabilidad")).toBe(true);
    expect(produceExportacion("rectificacion")).toBe(false);
    expect(produceExportacion("oposicion")).toBe(false);
  });
});

describe("máquina de estado del incidente", () => {
  it("avanza por el flujo y permite cerrar desde cualquier estado abierto", () => {
    expect(puedeAvanzarIncidente("abierto", "en_evaluacion")).toBe(true);
    expect(puedeAvanzarIncidente("en_evaluacion", "notificado")).toBe(true);
    expect(puedeAvanzarIncidente("notificado", "cerrado")).toBe(true);
    expect(puedeAvanzarIncidente("abierto", "cerrado")).toBe(true);
    expect(esTerminalIncidente("cerrado")).toBe(true);
  });

  it("no retrocede ni sale de cerrado", () => {
    expect(puedeAvanzarIncidente("notificado", "abierto")).toBe(false);
    expect(puedeAvanzarIncidente("cerrado", "notificado")).toBe(false);
  });
});
