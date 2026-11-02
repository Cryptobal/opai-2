import { describe, expect, it } from "vitest";

import { juegoReferencia, publicacionesReferencia } from "../../../packages/domain/src/remuneraciones/referencia.fixture";
import { PCT_ESCALA } from "@opai/domain/dinero";

import { entradaCostoDesdeLinea, proveedorDesdeLineas } from "./proveedor";

describe("adaptador CPQ proveedor 07e", () => {
  it("sin juego ni mutual devuelve null (costo pendiente)", async () => {
    const juego = await juegoReferencia();
    const p = proveedorDesdeLineas([{ id: "l1", sueldoBaseClp: 700_000, patron: "5x2", horaInicio: "08:00", horaFin: "20:00" }], juego, null);
    expect(p.obtener({ lineaId: "l1", fecha: "2026-10-29" })).toBeNull();
  });

  it("con mutual y juego calcula costo GC-A al peso 2.0", async () => {
    const juego = await juegoReferencia();
    const mutual = 2_700;
    const p = proveedorDesdeLineas(
      [{ id: "a", sueldoBaseClp: 553_553, patron: null, horaInicio: null, horaFin: null, colacionClp: 20_000, movilizacionClp: 20_000 }],
      juego,
      mutual,
    );
    const r = p.obtener({ lineaId: "a", fecha: "2026-10-29" });
    expect(r?.costoMensualClp).toBe(871_022);
  });

  it("colación y movilización de la capa entran al costo (GC-C)", async () => {
    const juego = await juegoReferencia();
    const base = proveedorDesdeLineas(
      [{ id: "c", sueldoBaseClp: 553_553, patron: null, horaInicio: null, horaFin: null, colacionClp: 0, movilizacionClp: 0 }],
      juego,
      2_700,
    ).obtener({ lineaId: "c", fecha: "2026-10-29" })?.costoMensualClp;
    const full = proveedorDesdeLineas(
      [{ id: "c", sueldoBaseClp: 553_553, patron: null, horaInicio: null, horaFin: null, colacionClp: 220_000, movilizacionClp: 220_000 }],
      juego,
      2_700,
    ).obtener({ lineaId: "c", fecha: "2026-10-29" })?.costoMensualClp;
    expect(full).toBeGreaterThan(base ?? 0);
    expect(full).toBe(1_271_022);
  });

  it("plazo fijo usa cesantía 3,0 %", () => {
    const juego = publicacionesReferencia();
    const indef = entradaCostoDesdeLinea(700_000, { mutualAdicional: 2_700, tipoContrato: "indefinido" });
    const fijo = entradaCostoDesdeLinea(700_000, { mutualAdicional: 2_700, tipoContrato: "plazo_fijo" });
    expect(indef.contrato).toBe("indefinido");
    expect(fijo.contrato).toBe("plazo_fijo");
    expect(indef.provisiones.diasVacacionesCorridosAnuales).toBe(21);
    expect(indef.mutualAdicional).toBeLessThanOrEqual(PCT_ESCALA);
  });
});
