import { describe, expect, it } from "vitest";

import type { Estructura } from "../estructuras";
import { costoEmpleadorPorPersona } from "../remuneraciones/costo-empresa";
import { horasExtraClp } from "../remuneraciones/horas-extra";
import { entradaReferencia, publicacionesReferencia, REFERENCIA } from "../remuneraciones/referencia.fixture";
import { juegoDeValores } from "../remuneraciones/valores";
import { liquidacionDelMes, type EntradaLiquidacion } from "./liquidacion";

const capa = (over: Partial<Estructura> = {}): Estructura => ({
  id: "capa-1", nivel: "puesto", sueldoBase: 553_553, colacion: 0, movilizacion: 0, gratificacion: "legal_25",
  gratificacionMonto: null, vigenteDesde: "2026-01-01", vigenteHasta: null, estado: "vigente", items: [], ...over,
});
const sinNovedades = { diasLicencia: 0, diasAusencia: 0, minutosExtra: 0, anticipos: 0, prestamos: 0, descuentos: 0 };
const entrada = (over: Partial<EntradaLiquidacion> = {}): EntradaLiquidacion => ({
  capa: capa(), contrato: "indefinido", afp: "modelo", salud: { tipo: "fonasa" }, jornadaMinutosSemanales: 42 * 60,
  mutualAdicional: 2_700, diasVinculo: 30, novedades: sinNovedades, ...over,
});
const juego = () => juegoDeValores("2026-11-01", publicacionesReferencia());
const motor = async (base = 553_553) =>
  costoEmpleadorPorPersona({ ...entradaReferencia(base), mutualAdicional: 2_700 }, await juego());

describe("nomina · liquidación del mes", () => {
  it("CA1: mes completo sin novedades = líquido y costo del motor", async () => {
    const l = liquidacionDelMes(entrada(), await juego());
    const m = await motor();
    expect(l.diasTrabajados).toBe(30);
    expect(l.liquido).toBe(m.liquidoEstimadoClp);
    expect(l.costoEmpresa).toBe(m.costoEmpresaMensualClp);
    expect(l.totalHaberes - l.totalDescuentosLegales).toBe(l.liquido);
    expect(l.haberes.find((h) => h.concepto === "Sueldo base")?.monto).toBe(553_553);
    // Los aportes del empleador (para el LRE) más haberes y provisiones dan el costo empresa.
    expect(l.prevision.basePrevisional).toBeGreaterThan(0);
    expect(l.aportesEmpleador.map((a) => a.concepto)).toEqual(expect.arrayContaining(["SIS", "Seguro de cesantía empleador"]));
    expect(l.aportesEmpleador.reduce((s, a) => s + a.monto, 0) + l.totalHaberes).toBeLessThanOrEqual(l.costoEmpresa);
  });

  it("CA2: 10 días de licencia pagan 20/30 del sueldo base", async () => {
    const l = liquidacionDelMes(entrada({ novedades: { ...sinNovedades, diasLicencia: 10 } }), await juego());
    expect(l.diasTrabajados).toBe(20);
    expect(l.diasLicencia).toBe(10);
    expect(l.haberes.find((h) => h.concepto === "Sueldo base")?.monto).toBe(369_035);
  });

  it("ingreso a mitad de mes: solo los días del vínculo", async () => {
    const l = liquidacionDelMes(entrada({ diasVinculo: 15, novedades: { ...sinNovedades, diasAusencia: 5 } }), await juego());
    expect(l.diasTrabajados).toBe(10);
  });

  it("CA3: horas extra con R19, imponibles", async () => {
    const j = await juego();
    const l = liquidacionDelMes(entrada({ novedades: { ...sinNovedades, minutosExtra: 600 } }), j);
    const valor = horasExtraClp({ sueldoBaseClp: 553_553, immClp: REFERENCIA.imm, jornadaLegalHoras: 42,
      jornadaMinutosSemanales: 42 * 60, minutosExtra: 600 });
    expect(l.haberes.find((h) => h.concepto === "Horas extra")?.monto).toBe(valor);
    expect(l.imponible).toBeGreaterThan(liquidacionDelMes(entrada(), j).imponible + valor - 1);
  });

  it("CA4: anticipos, cuotas y descuentos bajan el líquido, no el imponible", async () => {
    const j = await juego();
    const base = liquidacionDelMes(entrada(), j);
    const l = liquidacionDelMes(entrada({ novedades: { ...sinNovedades, anticipos: 100_000, prestamos: 30_000, descuentos: 5_000 } }), j);
    expect(l.imponible).toBe(base.imponible);
    expect(l.liquido).toBe(base.liquido - 135_000);
    expect(l.otrosDescuentos.map((d) => d.concepto)).toEqual(["Anticipos", "Cuotas de préstamo", "Descuentos"]);
  });

  it("licencia completa: sin haberes ni líquido; avisa si el líquido queda negativo", async () => {
    const j = await juego();
    const l = liquidacionDelMes(entrada({ novedades: { ...sinNovedades, diasLicencia: 30, prestamos: 10_000 } }), j);
    expect(l.totalHaberes).toBe(0);
    expect(l.liquido).toBe(-10_000);
    expect(l.advertencias.some((a) => /líquido negativo/i.test(a))).toBe(true);
  });

  it("avisa cuando préstamos y descuentos pasan el 15 % de los haberes (CAR-455)", async () => {
    const l = liquidacionDelMes(entrada({ novedades: { ...sinNovedades, prestamos: 150_000 } }), await juego());
    expect(l.advertencias.some((a) => a.includes("15 %"))).toBe(true);
  });

  it("avisa sueldo base bajo el mínimo según la capa del mes completo, no por días", async () => {
    const j = await juego();
    expect(liquidacionDelMes(entrada({ novedades: { ...sinNovedades, diasLicencia: 10 } }), j).advertencias
      .some((a) => a.includes("mínimo"))).toBe(false);
    expect(liquidacionDelMes(entrada({ capa: capa({ sueldoBase: 400_000 }) }), j).advertencias
      .some((a) => a.includes("mínimo"))).toBe(true);
  });

  it("guarda la capa y la huella del juego (R21)", async () => {
    const j = await juego();
    const l = liquidacionDelMes(entrada(), j);
    expect(l.capaId).toBe("capa-1");
    expect(l.huellaJuego).toBe(j.huella);
  });
});
