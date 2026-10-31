import { describe, expect, it } from "vitest";

import {
  ESTADOS_PERIODO,
  anticiposDelPeriodo,
  clavesCalendarioAnio,
  esRetrocesoPeriodo,
  etiquetaPeriodo,
  fechaAnticipoQuincenal,
  fechaCierrePrevista,
  limitesPeriodo,
  periodoAdmiteNovedades,
  planDeCuotas,
  plazoVisible,
  prestamoSaldado,
  saldoPrestamo,
  transicionObligacionValida,
  transicionPeriodoValida,
} from "./index";

describe("nomina · período", () => {
  it("avanza abierto → en revisión → cerrado → pagado", () => {
    expect(transicionPeriodoValida("abierto", "en_revision")).toBe(true);
    expect(transicionPeriodoValida("en_revision", "cerrado")).toBe(true);
    expect(transicionPeriodoValida("cerrado", "pagado")).toBe(true);
  });

  it("no salta etapas ni sale de pagado", () => {
    expect(transicionPeriodoValida("abierto", "cerrado")).toBe(false);
    expect(transicionPeriodoValida("abierto", "pagado")).toBe(false);
    for (const a of ESTADOS_PERIODO) expect(transicionPeriodoValida("pagado", a)).toBe(false);
  });

  it("permite devolver hasta el pago y lo marca como retroceso", () => {
    expect(esRetrocesoPeriodo("en_revision", "abierto")).toBe(true);
    expect(esRetrocesoPeriodo("cerrado", "en_revision")).toBe(true);
    expect(esRetrocesoPeriodo("abierto", "en_revision")).toBe(false);
    expect(esRetrocesoPeriodo("cerrado", "abierto")).toBe(false);
  });

  it("solo admite novedades antes del cierre", () => {
    expect(periodoAdmiteNovedades("abierto")).toBe(true);
    expect(periodoAdmiteNovedades("en_revision")).toBe(true);
    expect(periodoAdmiteNovedades("cerrado")).toBe(false);
    expect(periodoAdmiteNovedades("pagado")).toBe(false);
  });

  it("calcula límites del mes, bisiestos incluidos", () => {
    expect(limitesPeriodo(2026, 10)).toEqual({ inicio: "2026-10-01", fin: "2026-10-31" });
    expect(limitesPeriodo(2028, 2).fin).toBe("2028-02-29");
    expect(limitesPeriodo(2027, 2).fin).toBe("2027-02-28");
    expect(etiquetaPeriodo(2026, 10)).toBe("Octubre 2026");
  });

  it("acota el día de cierre al último día del mes", () => {
    expect(fechaCierrePrevista(2027, 2, 31)).toBe("2027-02-28");
    expect(fechaCierrePrevista(2026, 10, 25)).toBe("2026-10-25");
    expect(fechaCierrePrevista(2026, 10, 0)).toBe("2026-10-01");
  });
});

describe("nomina · plan de cuotas de un préstamo (B3)", () => {
  it("reparte en enteros y la suma es exactamente el total", () => {
    const plan = planDeCuotas({ montoTotal: 100_000, cuotas: 3, primeraCuotaAnio: 2026, primeraCuotaMes: 11 });
    expect(plan.map((c) => c.monto)).toEqual([33_333, 33_333, 33_334]);
    expect(plan.reduce((s, c) => s + c.monto, 0)).toBe(100_000);
    expect(plan.every((c) => Number.isInteger(c.monto))).toBe(true);
  });

  it("cruza el año al pasar de diciembre", () => {
    const plan = planDeCuotas({ montoTotal: 90_000, cuotas: 3, primeraCuotaAnio: 2026, primeraCuotaMes: 11 });
    expect(plan.map((c) => [c.anio, c.mes])).toEqual([[2026, 11], [2026, 12], [2027, 1]]);
    expect(plan.map((c) => c.numero)).toEqual([1, 2, 3]);
  });

  it("una cuota única lleva todo el monto", () => {
    expect(planDeCuotas({ montoTotal: 50_000, cuotas: 1, primeraCuotaAnio: 2026, primeraCuotaMes: 1 })).toEqual([
      { numero: 1, anio: 2026, mes: 1, monto: 50_000 },
    ]);
  });

  it("rechaza montos no enteros, cuotas fuera de rango y mes inválido", () => {
    const base = { montoTotal: 100_000, cuotas: 4, primeraCuotaAnio: 2026, primeraCuotaMes: 1 };
    expect(() => planDeCuotas({ ...base, montoTotal: 1000.5 })).toThrow(RangeError);
    expect(() => planDeCuotas({ ...base, montoTotal: 0 })).toThrow(RangeError);
    expect(() => planDeCuotas({ ...base, cuotas: 0 })).toThrow(RangeError);
    expect(() => planDeCuotas({ ...base, cuotas: 61 })).toThrow(RangeError);
    expect(() => planDeCuotas({ ...base, montoTotal: 3, cuotas: 4 })).toThrow(RangeError);
    expect(() => planDeCuotas({ ...base, primeraCuotaMes: 13 })).toThrow(RangeError);
  });

  it("calcula el saldo y detecta el préstamo saldado", () => {
    const cuotas = [
      { monto: 30_000, estado: "descontada" as const },
      { monto: 30_000, estado: "pendiente" as const },
      { monto: 30_000, estado: "condonada" as const },
    ];
    expect(saldoPrestamo(cuotas)).toBe(30_000);
    expect(prestamoSaldado(cuotas)).toBe(false);
    expect(prestamoSaldado([{ monto: 1, estado: "descontada" }, { monto: 1, estado: "condonada" }])).toBe(true);
    expect(prestamoSaldado([])).toBe(false);
  });
});

describe("nomina · anticipo quincenal (B2)", () => {
  it("acota el día al último día del mes", () => {
    expect(fechaAnticipoQuincenal(2026, 11, 15)).toBe("2026-11-15");
    expect(fechaAnticipoQuincenal(2027, 2, 31)).toBe("2027-02-28");
    expect(fechaAnticipoQuincenal(2026, 11, 0)).toBe("2026-11-01");
  });

  it("genera solo anticipos de monto fijo de reglas activas y explica los omitidos", () => {
    const r = anticiposDelPeriodo(
      [
        { personaId: "a", activa: true, modo: "monto_fijo", valor: 150_000, diaMes: 15 },
        { personaId: "b", activa: false, modo: "monto_fijo", valor: 100_000, diaMes: 15 },
        { personaId: "c", activa: true, modo: "porcentaje_base", valor: 3000, diaMes: 15 },
        { personaId: "d", activa: true, modo: "monto_fijo", valor: 0, diaMes: 15 },
      ],
      2026,
      11,
    );
    expect(r.generados).toEqual([{ personaId: "a", fecha: "2026-11-15", monto: 150_000 }]);
    expect(r.omitidos).toEqual([
      { personaId: "b", motivo: "inactiva" },
      { personaId: "c", motivo: "requiere_sueldo_base" },
      { personaId: "d", motivo: "monto_invalido" },
    ]);
  });
});

describe("nomina · obligaciones", () => {
  it("arma el calendario del año: 3 mensuales × 12 + 2 anuales", () => {
    const c = clavesCalendarioAnio(2026);
    expect(c).toHaveLength(38);
    expect(c.filter((k) => k.mes === null).map((k) => k.tipo)).toEqual(["dj_sueldos", "certificado_sueldos"]);
  });

  it("valida las transiciones y deja pagado como terminal", () => {
    expect(transicionObligacionValida("por_generar", "generado")).toBe(true);
    expect(transicionObligacionValida("con_errores", "generado")).toBe(true);
    expect(transicionObligacionValida("con_errores", "pagado")).toBe(false);
    expect(transicionObligacionValida("pagado", "por_generar")).toBe(false);
  });

  it("muestra el plazo solo si está verificado", () => {
    expect(plazoVisible({ fechaLimite: "2026-11-13", plazoVerificado: false })).toBeNull();
    expect(plazoVisible({ fechaLimite: null, plazoVerificado: true })).toBeNull();
    expect(plazoVisible({ fechaLimite: "2026-11-13", plazoVerificado: true })).toBe("2026-11-13");
  });
});
