import { describe, expect, it } from "vitest";

import { archivoPrevired, CAMPOS_PREVIRED, lineaPrevired, type DatosPrevired } from "./previred";

const base: DatosPrevired = {
  personaId: "p1",
  rut: "12.345.678-5",
  apellidos: "Pérez Soto",
  nombres: "Ana María",
  sexo: "femenino",
  extranjero: false,
  pensionado: false,
  diasTrabajados: 30,
  ingresoEnMes: null,
  retiroEnMes: null,
  tramoAsignacion: null,
  cargas: { simples: 1, maternales: 0, invalidez: 0 },
  prevision: { afp: "modelo", salud: "fonasa", basePrevisional: 750_000, baseCesantia: 750_000 },
  descuentosLegales: [
    { concepto: "AFP", monto: 79_350 },
    { concepto: "Salud", monto: 52_500 },
    { concepto: "Seguro de cesantía", monto: 4_500 },
  ],
  aportesEmpleador: [
    { concepto: "SIS", monto: 11_250 },
    { concepto: "Seguro de cesantía empleador", monto: 18_000 },
    { concepto: "Ley 16.744 y SANNA", monto: 7_000 },
  ],
};
const campo = (c: (string | number)[], n: number) => c[n - 1];

describe("Previred (105 campos)", () => {
  it("arma una línea con los 105 campos y los montos en su lugar", () => {
    const { campos, errores } = lineaPrevired(base, 2026, 11);
    expect(errores).toEqual([]);
    expect(campos).toHaveLength(CAMPOS_PREVIRED);
    expect([1, 2, 3, 4, 5, 6].map((n) => campo(campos, n))).toEqual(["12345678", "5", "Pérez", "Soto", "Ana María", "F"]);
    expect(campo(campos, 9)).toBe("112026");
    expect(campo(campos, 14)).toBe("00");
    expect(campo(campos, 18)).toBe("D");
    expect(campo(campos, 26)).toBe(34);
    expect([27, 28, 29].map((n) => campo(campos, n))).toEqual([750_000, 79_350, 11_250]);
    expect([70, 75].map((n) => campo(campos, n))).toEqual([52_500, 7]);
    expect([100, 101, 102].map((n) => campo(campos, n))).toEqual([750_000, 4_500, 18_000]);
    expect(campo(campos, 98)).toBe(7_000);
    expect(campo(campos, 105)).toBe("");
  });

  it("isapre: separa la cotización obligatoria (7 %) de la adicional", () => {
    const { campos } = lineaPrevired({ ...base, prevision: { ...base.prevision!, salud: "isapre" }, descuentosLegales: [{ concepto: "Salud", monto: 80_000 }] }, 2026, 11);
    expect([70, 77, 79, 80, 81].map((n) => campo(campos, n))).toEqual([0, 750_000, 80_000, 52_500, 27_500]);
  });

  it("marca ingreso y retiro del mes con sus fechas", () => {
    const { campos } = lineaPrevired({ ...base, ingresoEnMes: "2026-11-03" }, 2026, 11);
    expect([15, 16].map((n) => campo(campos, n))).toEqual([1, "03/11/2026"]);
    const r = lineaPrevired({ ...base, retiroEnMes: "2026-11-20" }, 2026, 11).campos;
    expect([15, 17].map((n) => campo(r, n))).toEqual([2, "20/11/2026"]);
  });

  it("informa RUT inválido, sexo faltante y liquidaciones sin previsión", () => {
    const { errores } = lineaPrevired({ ...base, rut: "1-1", sexo: null, prevision: null, aportesEmpleador: null }, 2026, 11);
    expect(errores.map((e) => e.mensaje)).toEqual([
      "RUT inválido.",
      "Falta el sexo (F o M) que pide Previred.",
      "Liquidación sin datos de previsión: recalcula el período.",
      "Liquidación sin aportes del empleador: recalcula el período.",
    ]);
  });

  it("el archivo no lleva encabezado y el nombre lleva el mes", () => {
    const a = archivoPrevired({ rutEmpleador: "76.543.210-3", anio: 2026, mes: 11, filas: [base] });
    expect(a.nombre).toBe("previred_76543210_112026.txt");
    expect(a.contenido.split("\r\n")[0]?.split(";")).toHaveLength(CAMPOS_PREVIRED);
    expect(a.errores).toEqual([]);
    expect(archivoPrevired({ rutEmpleador: "", anio: 2026, mes: 1, filas: [] }).errores[0]?.personaId).toBeNull();
  });
});
