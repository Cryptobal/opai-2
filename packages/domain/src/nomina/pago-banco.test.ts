import { describe, expect, it } from "vitest";

import { archivoPagoBanco } from "./pago-banco";

describe("archivoPagoBanco", () => {
  it("arma CSV con cabecera y filas", () => {
    const a = archivoPagoBanco({
      rutEmpleador: "76.543.210-3",
      anio: 2026,
      mes: 5,
      formatoBanco: "Santander",
      filas: [
        {
          personaId: "p1",
          rut: "1-9",
          nombre: "Ana Pérez",
          bancoCodigo: "037",
          tipoCuenta: "corriente",
          numeroCuenta: "12345678",
          montoClp: 500_000,
        },
      ],
      erroresPrevios: [],
    });
    expect(a.nombre).toBe("pago_banco_76543210_052026.csv");
    expect(a.contenido).toContain("rut;nombre;banco_codigo");
    expect(a.contenido).toContain("12345678;500000");
    expect(a.filas).toBe(1);
  });
});