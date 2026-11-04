import { describe, expect, it } from "vitest";

import { fechaRcv, leerRcv } from "./rcv";

const CAB = "Nro;Tipo Doc;Tipo Compra;RUT Proveedor;Razon Social;Folio;Fecha Docto;Fecha Recepcion;Monto Exento;Monto Neto;Monto IVA Recuperable;Monto Total";

describe("leerRcv", () => {
  it("lee las columnas por nombre y entiende fechas y miles", () => {
    const r = leerRcv(`${CAB}\n1;33;Del Giro;76.123.456-7;Proveedor SpA;1234;03/11/2026;04/11/2026 10:00:00;0;1.000;190;1.190`);
    expect(r.errores).toEqual([]);
    expect(r.filas).toEqual([
      expect.objectContaining({ proveedorRut: "76.123.456-7", tipoDte: 33, folio: 1234, fechaEmision: "2026-11-03", montoNeto: 1000, montoIva: 190, montoTotal: 1190 }),
    ]);
  });

  it("informa cada fila mala con su línea y deja pasar las buenas", () => {
    const r = leerRcv(`${CAB}\n1;39;x;76.1-1;A;5;03/11/2026;;0;0;0;100\n2;33;x;76.1-1;A;0;03/11/2026;;0;1;0;1\n3;33;x;76.1-1;A;7;31/02/2026;;0;1;0;1\n4;61;x;76.1-1;A;8;02/11/2026;;0;5;1;6`);
    expect(r.errores.map((e) => e.linea)).toEqual([2, 3, 4]);
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]).toMatchObject({ tipoDte: 61, folio: 8 });
  });

  it("rechaza un archivo sin las columnas esperadas", () => {
    expect(leerRcv("a;b\n1;2").errores).toHaveLength(1);
    expect(leerRcv("").filas).toEqual([]);
  });

  it("fechaRcv acepta dd/mm/aaaa y aaaa-mm-dd", () => {
    expect(fechaRcv("5/1/2026")).toBe("2026-01-05");
    expect(fechaRcv("2026-01-05")).toBe("2026-01-05");
    expect(fechaRcv("hola")).toBeNull();
  });
});
