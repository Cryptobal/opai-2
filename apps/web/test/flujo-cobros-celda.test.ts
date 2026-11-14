import { describe, expect, it } from "vitest";

import {
  cobrosDeSemana,
  FILA_COBROS_ESPERADOS,
} from "@/app/(erp)/finanzas/flujo/_componentes/cobros-celda";
import { armarPlanilla, type Planilla } from "@/app/(erp)/finanzas/flujo/_componentes/datos";

const S = "2026-11-16";
const doc = (n: number) => `0192f3a0-0000-7000-8000-00000000000${n}`;

const planilla = (): Planilla => ({
  ajustes: {
    umbral: 0,
    horizonteSemanas: 12,
    calendarioPagos: {},
    avisoActivo: false,
    metaCeldaMs: 100,
    metaGuardadoP95Ms: 1000,
    metaCargaInicialS: 2,
    metasVisibles: false,
  },
  aviso: { activo: false, umbral: 0, semanas: [] },
  saldoBanco: { fuente: "sin_banco", saldo: null, cuentasSinSaldo: [] },
  avisos: [],
  columnaHoy: S,
  filas: [
    {
      id: FILA_COBROS_ESPERADOS,
      etiqueta: "Cobros esperados",
      seccion: "ingreso",
      vinculo: null,
      arrastre: false,
      orden: 0,
      activa: true,
    },
  ],
  semanas: [
    {
      semana: S,
      ingresos: 0,
      egresos: 0,
      saldoInicial: 0,
      neto: 0,
      saldoFinal: 0,
      tono: null,
      pasada: false,
    },
  ],
  celdas: [
    {
      id: doc(1),
      filaId: FILA_COBROS_ESPERADOS,
      semana: S,
      capa: "comprometido",
      monto: 300_000,
      nota: "DTE 33 folio 10 · cobro esperado 2026-11-18 (vencimiento)",
      cobro: { documentoId: doc(1), fechaEsperada: "2026-11-18", origen: "vencimiento" },
    },
    {
      id: doc(2),
      filaId: FILA_COBROS_ESPERADOS,
      semana: S,
      capa: "comprometido",
      monto: 900_000,
      nota: "DTE 33 folio 11 · cobro esperado 2026-11-17 (fijada a mano)",
      cobro: { documentoId: doc(2), fechaEsperada: "2026-11-17", origen: "manual" },
    },
    // Programación: sin fecha propia, no se cambia desde aquí.
    {
      id: doc(3),
      filaId: FILA_COBROS_ESPERADOS,
      semana: S,
      capa: "comprometido",
      monto: 50_000,
      nota: "Programación · programación",
    },
  ],
});

describe("cobrosDeSemana (CAR-396)", () => {
  it("lista solo las facturas con fecha propia, de mayor a menor monto, con etiqueta sin la fecha", () => {
    const r = cobrosDeSemana(planilla(), FILA_COBROS_ESPERADOS, S);
    expect(r.map((c) => c.documentoId)).toEqual([doc(2), doc(1)]);
    expect(r[0]).toMatchObject({
      etiqueta: "DTE 33 folio 11",
      origen: "manual",
      fechaEsperada: "2026-11-17",
    });
  });
  it("otra fila u otra semana no tiene cobros", () => {
    expect(cobrosDeSemana(planilla(), "otra", S)).toEqual([]);
    expect(cobrosDeSemana(planilla(), FILA_COBROS_ESPERADOS, "2026-11-23")).toEqual([]);
  });
  it("la celda de cobros se puede tocar solo si quien mira gestiona el flujo", () => {
    expect(
      armarPlanilla(planilla(), { gestiona: true }).celdaEditable(FILA_COBROS_ESPERADOS, S),
    ).toBe(true);
    expect(
      armarPlanilla(planilla(), { gestiona: false }).celdaEditable(FILA_COBROS_ESPERADOS, S),
    ).toBe(false);
  });
});
