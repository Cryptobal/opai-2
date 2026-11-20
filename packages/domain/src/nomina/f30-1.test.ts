import { describe, expect, it } from "vitest";

import { archivoF301 } from "./f30-1";

describe("archivoF301", () => {
  it("arma el certificado con totales del mes", () => {
    const a = archivoF301({
      rutEmpleador: "12.345.678-5",
      anio: 2026,
      mes: 11,
      resumen: { trabajadores: 3, totalLiquido: 1_500_000, totalImponible: 2_000_000 },
    });
    expect(a.errores).toEqual([]);
    expect(a.filas).toBe(3);
    expect(a.nombre).toBe("f30_1_12345678_112026.txt");
    expect(a.contenido).toContain("F30-1");
    expect(a.contenido).toContain("1500000");
  });

  it("exige RUT y liquidaciones", () => {
    const a = archivoF301({ rutEmpleador: "", anio: 2026, mes: 1, resumen: { trabajadores: 0, totalLiquido: 0, totalImponible: 0 } });
    expect(a.errores.map((e) => e.mensaje)).toEqual([
      "Falta el RUT del empleador en Ajustes o en los datos de la empresa.",
      "El período no tiene liquidaciones con contrato vigente.",
    ]);
  });
});