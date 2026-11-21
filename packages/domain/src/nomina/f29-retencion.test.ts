import { describe, expect, it } from "vitest";

import { archivoF29Retencion, retencionImpuestoUnico } from "./f29-retencion";

describe("retencionImpuestoUnico", () => {
  it("lee el monto del concepto Impuesto único", () => {
    expect(
      retencionImpuestoUnico([
        { concepto: "AFP", monto: 1 },
        { concepto: "Impuesto único", monto: 42_000 },
      ]),
    ).toBe(42_000);
  });
});

describe("archivoF29Retencion", () => {
  it("nombra el archivo y suma retenciones", () => {
    const a = archivoF29Retencion({
      rutEmpleador: "76.543.210-3",
      anio: 2026,
      mes: 11,
      filas: [{ personaId: "p1", rut: "1-9", nombre: "Ana", retencionClp: 10_000 }],
    });
    expect(a.nombre).toBe("f29_retencion_76543210_112026.xlsx");
    expect(a.totalRetencionClp).toBe(10_000);
    expect(a.errores).toHaveLength(0);
  });
});