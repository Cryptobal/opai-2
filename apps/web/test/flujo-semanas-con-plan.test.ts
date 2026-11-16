import { describe, expect, it } from "vitest";

import { filaTienePlanMovible, semanasConPlan } from "@/app/(erp)/finanzas/flujo/_componentes/semanas-con-plan";
import type { Planilla } from "@/app/(erp)/finanzas/flujo/_componentes/datos";

const base: Planilla = {
  ajustes: { umbral: 0, horizonteSemanas: 12, calendarioPagos: {}, avisoActivo: true, metaCeldaMs: 0, metaGuardadoP95Ms: 0, metaCargaInicialS: 0, metasVisibles: false },
  filas: [{ id: "f1", seccion: "egreso", grupo: "gastos", etiqueta: "Arriendo", vinculo: null, arrastre: false, orden: 0, activa: true }],
  celdas: [
    { id: "c1", filaId: "f1", semana: "2026-10-19", capa: "plan", monto: 100, nota: null },
    { id: "c2", filaId: "f1", semana: "2026-11-16", capa: "comprometido", monto: 200, nota: null },
  ],
  semanas: [
    { semana: "2026-10-19", ingresos: 0, egresos: 0, saldoInicial: 0, neto: 0, saldoFinal: 0, tono: null, pasada: true },
    { semana: "2026-11-16", ingresos: 0, egresos: 0, saldoInicial: 0, neto: 0, saldoFinal: 0, tono: null, pasada: false },
  ],
  aviso: { activo: false, umbral: 0, semanas: [] },
  saldoBanco: { fuente: "sin_banco", saldo: null, cuentasSinSaldo: [] },
  avisos: [],
  columnaHoy: null,
};

describe("semanasConPlan", () => {
  it("solo semanas con capa plan", () => {
    expect(semanasConPlan(base, "f1")).toEqual(["2026-10-19"]);
    expect(filaTienePlanMovible(base, "f1")).toBe(true);
  });
  it("sin celdas plan no ofrece reprogramar", () => {
    expect(semanasConPlan(base, "otra")).toEqual([]);
    expect(filaTienePlanMovible(base, "otra")).toBe(false);
  });
});