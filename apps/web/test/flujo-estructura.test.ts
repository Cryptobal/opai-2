import { describe, expect, it } from "vitest";

import { FILA_COBROS_ESPERADOS } from "@/app/(erp)/finanzas/flujo/_componentes/cobros-celda";
import { armarPlanilla, type CeldaFlujo, type FilaFlujo, type Planilla } from "@/app/(erp)/finanzas/flujo/_componentes/datos";
import { abiertaPorDefecto, SEC_EGRESOS, SEC_INGRESOS } from "@/app/(erp)/finanzas/flujo/_componentes/estructura";

const S = "2026-11-16";
const S0 = "2026-11-09";
const id = (n: number) => `0192f3a0-0000-7000-8000-0000000001${String(n).padStart(2, "0")}`;
const FILA_DEPOSITO = "00000000-0000-4000-8000-000000000009";
const FILA_SIN_CONCILIAR_ING = "00000000-0000-4000-8000-000000000003";
const FILA_DIFERENCIA = "00000000-0000-4000-8000-000000000008";

const fila = (fid: string, seccion: FilaFlujo["seccion"], grupo: FilaFlujo["grupo"], etiqueta: string): FilaFlujo => ({
  id: fid, seccion, grupo, etiqueta, vinculo: null, arrastre: false, orden: 0, activa: true,
});
const celda = (n: number, filaId: string, semana: string, monto: number, capa: CeldaFlujo["capa"] = "plan"): CeldaFlujo => ({
  id: id(n), filaId, semana, capa, monto, nota: null,
});
const cobro = (n: number, monto: number, cuentaId: string, cuenta: string): CeldaFlujo => ({
  ...celda(n, FILA_COBROS_ESPERADOS, S, monto, "comprometido"),
  cliente: { cuentaId, cuenta, instalacionId: null, instalacion: null },
});

const FILAS = [
  fila(FILA_COBROS_ESPERADOS, "ingreso", null, "Cobros esperados"),
  fila(FILA_DEPOSITO, "ingreso", null, "Depósitos del factor"),
  fila(FILA_SIN_CONCILIAR_ING, "ingreso", null, "Sin conciliar (ingresos)"),
  fila(id(1), "egreso", "gastos", "Arriendo"),
  fila(id(2), "egreso", "impuestos", "IVA a pagar"),
  fila(id(3), "egreso", "financiamiento", "Crédito"),
  fila(FILA_DIFERENCIA, "egreso", "financiamiento", "Diferencia del factoring"),
];
const CELDAS = [
  cobro(10, 300_000, id(50), "Cliente A"),
  cobro(11, 100_000, id(51), "Cliente B"),
  celda(12, FILA_DEPOSITO, S, 40_000, "comprometido"),
  celda(13, id(1), S, 70_000),
  celda(14, id(2), S, 20_000),
  celda(15, id(3), S, 30_000),
  celda(16, id(3), S0, 5_000),
  celda(17, FILA_DIFERENCIA, S, 9_000, "comprometido"),
];

const semana = (s: string, pasada: boolean) => ({ semana: s, ingresos: 440_000, egresos: 120_000, saldoInicial: 0, neto: 0, saldoFinal: 0, tono: null, pasada });
const p: Planilla = {
  ajustes: { umbral: 0, horizonteSemanas: 12, calendarioPagos: {}, avisoActivo: false, metaCeldaMs: 100, metaGuardadoP95Ms: 1000, metaCargaInicialS: 2, metasVisibles: false },
  aviso: { activo: false, umbral: 0, semanas: [] },
  saldoBanco: { fuente: "sin_banco", saldo: null, cuentasSinSaldo: [] },
  avisos: [],
  columnaHoy: S,
  filas: FILAS,
  semanas: [semana(S0, true), semana(S, false)],
  celdas: CELDAS,
};

const ids = (a: ReturnType<typeof armarPlanilla>) => a.filas.map((f) => f.id);
const cerrar = (...cerradas: string[]) => (fid: string) => !cerradas.includes(fid) && abiertaPorDefecto(fid);

describe("planilla por secciones contraíbles (CAR-537)", () => {
  it("Ingresos con sus clientes y las filas automáticas; Egresos en grupos; luego los totales", () => {
    const a = armarPlanilla(p, { gestiona: true });
    expect(ids(a)).toEqual([
      SEC_INGRESOS, `cobro-cli:${id(50)}`, `cobro-cli:${id(51)}`, FILA_DEPOSITO, FILA_SIN_CONCILIAR_ING,
      SEC_EGRESOS, "grp:gastos", id(1), "grp:impuestos", id(2), "grp:financiamiento", id(3), FILA_DIFERENCIA,
      "total-ing", "total-egr", "saldo",
    ]);
    expect(a.filas.filter((f) => f.nivel === 2).map((f) => f.etiqueta)).toEqual(["Arriendo", "IVA a pagar", "Crédito", "Diferencia del factoring"]);
  });

  it("un grupo sin filas no se muestra", () => {
    expect(ids(armarPlanilla(p))).not.toContain("grp:remuneraciones");
  });

  it("contraer una sección o un grupo oculta lo que contiene", () => {
    const sinIngresos = armarPlanilla(p, { abierta: cerrar(SEC_INGRESOS) });
    expect(ids(sinIngresos).slice(0, 2)).toEqual([SEC_INGRESOS, SEC_EGRESOS]);
    const sinGastos = armarPlanilla(p, { abierta: cerrar("grp:gastos") });
    expect(ids(sinGastos)).toContain("grp:gastos");
    expect(ids(sinGastos)).not.toContain(id(1));
    expect(sinGastos.filas.find((f) => f.id === "grp:gastos")?.plegable).toEqual({ abierta: false });
    expect(ids(armarPlanilla(p, { abierta: cerrar(SEC_EGRESOS) }))).not.toContain("grp:gastos");
  });

  it("cada encabezado suma sus filas por semana; la diferencia del factoring no suma", () => {
    const a = armarPlanilla(p);
    expect(a.celda(SEC_INGRESOS, S)?.texto).toContain("440.000");
    expect(a.celda("grp:gastos", S)?.texto).toContain("70.000");
    expect(a.celda("grp:impuestos", S)?.texto).toContain("20.000");
    expect(a.celda("grp:financiamiento", S)?.texto).toContain("30.000");
    expect(a.celda(SEC_EGRESOS, S)?.texto).toContain("120.000");
    expect(a.celda("grp:gastos", S0)).toBeNull();
  });

  it("en una semana pasada no suma el plan sin respaldo en cartola", () => {
    const a = armarPlanilla(p);
    expect(a.celda("grp:financiamiento", S0)).toBeNull();
    expect(a.celda(id(3), S0)?.detalle).toContain("Plan sin respaldo");
  });

  it("las filas de encabezado no se editan y los totales finales siguen siendo los del servidor", () => {
    const a = armarPlanilla(p, { gestiona: true });
    expect([SEC_INGRESOS, SEC_EGRESOS, "grp:gastos"].some((h) => a.celdaEditable(h, S))).toBe(false);
    expect(a.celda("total-ing", S)?.texto).toContain("440.000");
    expect(a.celda("total-egr", S)?.texto).toContain("120.000");
  });

  it("empiezan abiertas las secciones y los grupos, y cerrados los clientes", () => {
    expect([SEC_INGRESOS, SEC_EGRESOS, "grp:gastos"].every(abiertaPorDefecto)).toBe(true);
    expect(abiertaPorDefecto(`cobro-cli:${id(50)}`)).toBe(false);
  });
});
