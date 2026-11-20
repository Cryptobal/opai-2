import { describe, expect, it } from "vitest";

import { archivoLre, filaLre, type DatosLre } from "./lre";
import { COLUMNAS_LRE } from "./lre-columnas";

const base: DatosLre = {
  personaId: "p1",
  rut: "12.345.678-5",
  inicioContrato: "2026-03-02",
  terminoContrato: null,
  diasTrabajados: 28,
  diasLicencia: 2,
  haberes: [
    { concepto: "Sueldo base", monto: 500_000 },
    { concepto: "Gratificación", monto: 125_000 },
    { concepto: "Horas extra", monto: 20_000 },
    { concepto: "Colación", monto: 30_000 },
  ],
  descuentosLegales: [
    { concepto: "AFP", monto: 70_000 },
    { concepto: "Salud", monto: 45_150 },
    { concepto: "Seguro de cesantía", monto: 3_870 },
    { concepto: "Impuesto único", monto: 0 },
  ],
  otrosDescuentos: [
    { concepto: "Anticipos", monto: 100_000 },
    { concepto: "Cuotas de préstamo", monto: 20_000 },
  ],
  aportesEmpleador: [
    { concepto: "Seguro de cesantía empleador", monto: 15_480 },
    { concepto: "Ley 16.744 y SANNA", monto: 6_000 },
    { concepto: "SIS", monto: 9_000 },
  ],
  liquido: 675_000 - 119_020 - 120_000,
};

describe("LRE", () => {
  it("las columnas no se repiten y parten por el RUT", () => {
    const codigos = COLUMNAS_LRE.map(([c]) => c);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(codigos[0]).toBe(1101);
  });

  it("asigna cada concepto a su columna y cuadra los totales", () => {
    const { valores, errores } = filaLre(base);
    expect(errores).toEqual([]);
    expect(valores.get(1101)).toBe("12345678-5");
    expect(valores.get(1102)).toBe("02/03/2026");
    expect(valores.has(1103)).toBe(false);
    expect(valores.get(2101)).toBe(500_000);
    expect(valores.get(2102)).toBe(20_000);
    expect(valores.get(3188)).toBe(120_000);
    expect(valores.get(5201)).toBe(675_000);
    expect(valores.get(5210)).toBe(645_000);
    expect(valores.get(5230)).toBe(30_000);
    expect(valores.get(5341)).toBe(119_020);
    expect(valores.get(5301)).toBe(239_020);
    expect(valores.get(5410)).toBe(30_480);
    expect(valores.get(5501)).toBe(base.liquido);
  });

  it("marca RUT inválido, líquido descuadrado y liquidaciones sin aportes", () => {
    const { errores } = filaLre({ ...base, rut: "12345678-0", liquido: 1, aportesEmpleador: null });
    expect(errores.map((e) => e.mensaje)).toEqual([
      "RUT inválido.",
      "Liquidación sin aportes del empleador: recalcula el período.",
      "El líquido no cuadra con haberes menos descuentos.",
    ]);
  });

  it("arma el archivo con «;», nombre rut_aaaamm y la fecha de término del mes", () => {
    const a = archivoLre({ rutEmpleador: "76.543.210-3", anio: 2026, mes: 11, filas: [{ ...base, terminoContrato: "2026-11-20" }] });
    const [encabezado, fila] = a.contenido.split("\r\n");
    expect(a.nombre).toBe("76543210_202611.csv");
    expect(encabezado?.split(";").length).toBe(COLUMNAS_LRE.length);
    expect(encabezado?.startsWith("Rut trabajador(1101);Fecha inicio contrato(1102)")).toBe(true);
    expect(fila?.split(";").slice(0, 3)).toEqual(["12345678-5", "02/03/2026", "20/11/2026"]);
    expect(a.filas).toBe(1);
    expect(a.advertencias[0]).toMatch(/^Formato por verificar/);
  });

  it("sin RUT del empleador lo informa como error general", () => {
    const a = archivoLre({ rutEmpleador: "", anio: 2026, mes: 1, filas: [] });
    expect(a.errores).toEqual([{ personaId: null, mensaje: expect.stringMatching(/RUT del empleador/) }]);
    expect(a.nombre).toBe("rut_202601.csv");
  });
});
