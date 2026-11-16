import { describe, expect, it } from "vitest";

import { FILA_COBROS_ESPERADOS, hojaEspecial } from "@/app/(erp)/finanzas/flujo/_componentes/cobros-celda";
import { armarPlanilla, type CeldaFlujo, type Planilla } from "@/app/(erp)/finanzas/flujo/_componentes/datos";
import { abiertaPorDefecto } from "@/app/(erp)/finanzas/flujo/_componentes/estructura";
import { filaBase } from "@/app/(erp)/finanzas/flujo/_componentes/grupos-cobro";

const S = "2026-11-16";
const S2 = "2026-11-23";
const id = (n: number) => `0192f3a0-0000-7000-8000-0000000000${String(n).padStart(2, "0")}`;
const CLI_A = id(50);
const CLI_B = id(51);
const INST_1 = id(60);
const INST_2 = id(61);

const cobro = (n: number, semana: string, monto: number, cliente: CeldaFlujo["cliente"]): CeldaFlujo => ({
  id: id(n),
  filaId: FILA_COBROS_ESPERADOS,
  semana,
  capa: "comprometido",
  monto,
  nota: `DTE 33 folio ${n} · cobro esperado ${semana} (vencimiento)`,
  cobro: { documentoId: id(n), fechaEsperada: semana, origen: "vencimiento" },
  ...(cliente ? { cliente } : {}),
});

const semana = (s: string) => ({ semana: s, ingresos: 0, egresos: 0, saldoInicial: 0, neto: 0, saldoFinal: 0, tono: null, pasada: false });

const planilla = (celdas: CeldaFlujo[]): Planilla => ({
  ajustes: { umbral: 0, horizonteSemanas: 12, calendarioPagos: {}, avisoActivo: false, metaCeldaMs: 100, metaGuardadoP95Ms: 1000, metaCargaInicialS: 2, metasVisibles: false },
  aviso: { activo: false, umbral: 0, semanas: [] },
  saldoBanco: { fuente: "sin_banco", saldo: null, cuentasSinSaldo: [] },
  avisos: [],
  columnaHoy: S,
  filas: [{ id: FILA_COBROS_ESPERADOS, etiqueta: "Cobros esperados", seccion: "ingreso", grupo: null, vinculo: null, arrastre: false, orden: 0, activa: true }],
  semanas: [semana(S), semana(S2)],
  celdas,
});

const clienteA = (inst: string | null, nombre: string | null) => ({ cuentaId: CLI_A, cuenta: "Cementera Andina", instalacionId: inst, instalacion: nombre });
const clienteB = { cuentaId: CLI_B, cuenta: "Bodegas del Sur", instalacionId: null, instalacion: null };

const p = planilla([
  cobro(1, S, 300_000, clienteA(INST_1, "Planta Norte")),
  cobro(2, S, 200_000, clienteA(INST_2, "Planta Sur")),
  cobro(3, S2, 100_000, clienteA(INST_1, "Planta Norte")),
  cobro(4, S, 50_000, clienteB),
]);

const abre = (...ids: string[]) => (id: string) => ids.includes(id) || abiertaPorDefecto(id);

describe("ingresos agrupados por cliente (CAR-456)", () => {
  it("los cobros se muestran por cliente dentro de Ingresos, con los clientes sumados al empezar", () => {
    const a = armarPlanilla(p, { gestiona: true });
    expect(a.filas.some((f) => f.id === FILA_COBROS_ESPERADOS)).toBe(false);
    expect(a.filas.filter((f) => f.nivel === 2)).toEqual([]);
  });

  it("muestra un cliente por fila, el de más monto primero", () => {
    const a = armarPlanilla(p, { gestiona: true });
    const hijas = a.filas.filter((f) => f.nivel === 1);
    expect(hijas.map((f) => f.etiqueta)).toEqual(["Cementera Andina", "Bodegas del Sur"]);
    expect(hijas[0]).toMatchObject({ sub: "2 instalaciones", plegable: { abierta: false } });
    expect(hijas[1]?.plegable).toBeUndefined();
    expect(a.celda(hijas[0]!.id, S)).toMatchObject({ tono: "info", detalle: "Comprometido · 2 cobros" });
    expect(a.celda(hijas[0]!.id, S)?.texto).toContain("500.000");
    expect(a.celda(hijas[1]!.id, S2)).toBeNull();
  });

  it("un cliente abierto muestra sus instalaciones con su propia suma", () => {
    const cli = `cobro-cli:${CLI_A}`;
    const a = armarPlanilla(p, { gestiona: true, abierta: abre(cli) });
    const nietas = a.filas.filter((f) => f.nivel === 2);
    expect(nietas.map((f) => f.etiqueta)).toEqual(["Planta Norte", "Planta Sur"]);
    expect(a.celda(nietas[0]!.id, S2)?.texto).toContain("100.000");
    expect(a.celda(nietas[1]!.id, S2)).toBeNull();
  });

  it("la celda de un grupo abre la hoja de cobros de su semana", () => {
    const a = armarPlanilla(p, { gestiona: true });
    const cli = `cobro-cli:${CLI_A}`;
    expect(a.celdaEditable(cli, S)).toBe(true);
    expect(hojaEspecial(p, filaBase(cli), S)).toEqual({ tipo: "cobros", semana: S });
    expect(armarPlanilla(p).celdaEditable(cli, S)).toBe(false);
  });

  it("un cobro sin cliente resuelto va a «Sin cliente»: las hijas suman lo mismo que la fila", () => {
    const mixta = planilla([cobro(1, S, 300_000, clienteB), cobro(2, S, 20_000, undefined)]);
    const a = armarPlanilla(mixta);
    expect(a.filas.filter((f) => f.nivel === 1).map((f) => f.etiqueta)).toEqual(["Bodegas del Sur", "Sin cliente"]);
    expect(a.celda("cobro-cli:sin", S)?.texto).toContain("20.000");
  });

  it("sin cobros con cliente queda la fila «Cobros esperados» tal cual, dentro de Ingresos", () => {
    const sinCliente = planilla([cobro(9, S, 10_000, undefined)]);
    const fila = armarPlanilla(sinCliente).filas.find((f) => f.id === FILA_COBROS_ESPERADOS);
    expect(fila).toMatchObject({ nivel: 1 });
    expect(fila?.plegable).toBeUndefined();
  });
});
