import { describe, expect, it } from "vitest";

import { enmascararRun, enviarRequiereAprobacion, plazoVence } from "./firma-flujo";

describe("firma-flujo — aprobación condicional del envío (R19, P12)", () => {
  it("toda solicitud N2 o N3 pide aprobación, sea cual sea la clase", () => {
    expect(enviarRequiereAprobacion("contrato_trabajo", "N2")).toBe(true);
    expect(enviarRequiereAprobacion("anexo_contrato", "N2")).toBe(true);
    expect(enviarRequiereAprobacion("recepcion_laboral", "N2")).toBe(true);
    expect(enviarRequiereAprobacion("acta", "N2")).toBe(true);
  });

  it("los envíos N1 de actas y recepciones no piden aprobación (decisión P12)", () => {
    expect(enviarRequiereAprobacion("acta", "N1")).toBe(false);
    expect(enviarRequiereAprobacion("acta_reunion", "N1")).toBe(false);
    expect(enviarRequiereAprobacion("recepcion_laboral", "N1")).toBe(false);
  });

  it("los envíos N1 de propuestas, contratos de servicio y cartas sí piden aprobación (R19)", () => {
    expect(enviarRequiereAprobacion("propuesta_comercial", "N1")).toBe(true);
    expect(enviarRequiereAprobacion("contrato_servicio", "N1")).toBe(true);
    expect(enviarRequiereAprobacion("carta_trabajador", "N1")).toBe(true);
  });
});

describe("firma-flujo — plazo y máscara", () => {
  it("suma los días del plazo en UTC (R8)", () => {
    const desde = new Date("2026-10-30T12:00:00.000Z");
    expect(plazoVence(desde, 7).toISOString()).toBe("2026-11-06T12:00:00.000Z");
  });

  it("enmascara el RUN dejando solo los últimos dígitos (CA8)", () => {
    expect(enmascararRun("12.345.678-9")).toBe("•••78-9");
    expect(enmascararRun(null)).toBeNull();
    expect(enmascararRun("1-9")).toBe("•••");
  });
});
