import { describe, expect, it } from "vitest";

import {
  DIAS_PRUEBA_GRATIS,
  estadoPruebaGratis,
  extenderPruebaGratis,
  finDePruebaGratis,
  motivoSinPrueba,
} from "./index";
import { sumarDias } from "../calendario/fechas";

describe("prueba gratis (CAR-222)", () => {
  it("dura 10 días contando el primero y vence al día 11", () => {
    expect(DIAS_PRUEBA_GRATIS).toBe(10);
    expect(finDePruebaGratis("2026-11-06")).toBe("2026-11-15");
    expect(estadoPruebaGratis("2026-11-15", "2026-11-15")).toBe("vigente");
    expect(estadoPruebaGratis("2026-11-15", "2026-11-16")).toBe("vencida");
  });

  it("suma días cruzando fin de mes y de año", () => {
    expect(sumarDias("2026-12-28", 5)).toBe("2027-01-02");
    expect(finDePruebaGratis("2026-02-25")).toBe("2026-03-06");
  });

  it("extiende desde el último día si sigue vigente y desde hoy si venció", () => {
    expect(extenderPruebaGratis("2026-11-15", "2026-11-12", 10)).toBe("2026-11-25");
    expect(extenderPruebaGratis("2026-11-15", "2026-11-20", 10)).toBe("2026-11-30");
  });

  it("un módulo solo se prueba si no está contratado", () => {
    expect(motivoSinPrueba("cpq", "CPQ", null, null)).toBeNull();
    expect(motivoSinPrueba("cpq", "CPQ", "activo", null)).toBe("CPQ ya está activo.");
    expect(motivoSinPrueba("cpq", "CPQ", "trial", null)).toBe("CPQ ya está en prueba.");
    expect(motivoSinPrueba("cpq", "CPQ", "suspendido", null)).toContain("contacta a OPAI");
    expect(motivoSinPrueba("cpq", "CPQ", "solo_lectura", null)).toContain("reactive");
  });

  it("una parte de Finanzas se prueba sin Finanzas contratado o con Finanzas en prueba", () => {
    expect(motivoSinPrueba("finanzas.bancos", "Bancos", null, null)).toBeNull();
    expect(motivoSinPrueba("finanzas.flujo", "Flujo de caja", null, "trial")).toBeNull();
    expect(motivoSinPrueba("finanzas.bancos", "Bancos", null, "activo")).toContain("incluye todas");
    expect(motivoSinPrueba("finanzas.bancos", "Bancos", null, "suspendido")).toContain("Finanzas");
  });
});
