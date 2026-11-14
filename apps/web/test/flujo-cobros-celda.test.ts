import { describe, expect, it } from "vitest";

import {
  cobrosDeSemana,
  FILA_COBROS_ESPERADOS,
  FILA_IVA,
  hojaEspecial,
  ivaDeSemana,
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

describe("ivaDeSemana y hojaEspecial (CAR-397)", () => {
  const conIva = (): Planilla => {
    const p = planilla();
    p.filas.push({
      id: FILA_IVA,
      etiqueta: "IVA a pagar",
      seccion: "egreso",
      vinculo: null,
      arrastre: false,
      orden: 1,
      activa: true,
    });
    p.celdas.push({
      id: doc(4),
      filaId: FILA_IVA,
      semana: S,
      capa: "comprometido",
      monto: 114_000,
      nota: "IVA de octubre 2026 · se paga el 2026-11-20",
      iva: { periodo: "2026-10", postergado: false, fechaPago: "2026-11-20" },
    });
    return p;
  };
  it("la celda de IVA trae el mes, el monto y si está postergado", () => {
    expect(ivaDeSemana(conIva(), FILA_IVA, S)).toEqual([
      { periodo: "2026-10", postergado: false, fechaPago: "2026-11-20", monto: 114_000 },
    ]);
  });
  it("cada celda abre su hoja; una fila normal no abre ninguna", () => {
    expect(hojaEspecial(conIva(), FILA_IVA, S)).toEqual({ tipo: "iva", semana: S });
    expect(hojaEspecial(conIva(), FILA_COBROS_ESPERADOS, S)).toEqual({ tipo: "cobros", semana: S });
    expect(hojaEspecial(conIva(), "otra", S)).toBeNull();
    expect(armarPlanilla(conIva(), { gestiona: true }).celdaEditable(FILA_IVA, S)).toBe(true);
  });
});
