import { describe, expect, it } from "vitest";

import { esAprobadorDeRegla, puedeResolver, type ReglaAprobacion, reglaAplicable } from "./reglas";

const regla = (id: string, accion: string, montoMinimo: number | null, activa = true) =>
  ({ id, accion, montoMinimo, aprobadorRol: "finanzas", aprobadorGrupoId: null, activa }) satisfies ReglaAprobacion;

describe("reglas de aprobación (CAR-252)", () => {
  const reglas = [regla("todo", "emitir_dte", null), regla("grande", "emitir_dte", 1_000_000)];

  it("aplica la regla más específica que se cumple", () => {
    expect(reglaAplicable(reglas, "emitir_dte", 2_000_000)?.id).toBe("grande");
    expect(reglaAplicable(reglas, "emitir_dte", 500_000)?.id).toBe("todo");
  });

  it("solo con monto mínimo: bajo el monto no aplica; sin monto conocido, sí", () => {
    const soloGrande = [regla("grande", "emitir_dte", 1_000_000)];
    expect(reglaAplicable(soloGrande, "emitir_dte", 999_999)).toBeNull();
    expect(reglaAplicable(soloGrande, "emitir_dte", null)?.id).toBe("grande");
  });

  it("ignora reglas inactivas y de otra acción", () => {
    expect(reglaAplicable([regla("x", "emitir_dte", null, false)], "emitir_dte", 1)).toBeNull();
    expect(reglaAplicable(reglas, "enviar_cotizacion", 1)).toBeNull();
  });

  it("aprobador por rol o por grupo", () => {
    expect(esAprobadorDeRegla({ aprobadorRol: "finanzas", aprobadorGrupoId: null }, { rol: "finanzas", grupos: [] })).toBe(true);
    expect(esAprobadorDeRegla({ aprobadorRol: null, aprobadorGrupoId: "g1" }, { rol: "ventas", grupos: ["g1"] })).toBe(true);
    expect(esAprobadorDeRegla({ aprobadorRol: "finanzas", aprobadorGrupoId: null }, { rol: "ventas", grupos: [] })).toBe(false);
  });

  it("nadie aprueba lo propio, salvo dueños y administradores", () => {
    expect(puedeResolver({ apruebaTodo: false, esAprobador: true, esSolicitante: true })).toBe(false);
    expect(puedeResolver({ apruebaTodo: false, esAprobador: true, esSolicitante: false })).toBe(true);
    expect(puedeResolver({ apruebaTodo: true, esAprobador: false, esSolicitante: true })).toBe(true);
    expect(puedeResolver({ apruebaTodo: false, esAprobador: false, esSolicitante: false })).toBe(false);
  });
});
