// CAR-234 · IndicadorExento de las líneas: una NC o ND sobre una factura exenta también es exenta (sus totales vienen sin
// neto ni IVA). Sin red: solo el JSON que se enviaría a SimpleAPI.
import { describe, expect, it } from "vitest";

import { jsonInputGenerarDte } from "./simpleapi-contrato";

const base = {
  ambiente: "certificacion" as const,
  folio: 1,
  fechaEmision: "2026-11-10",
  rutEmisor: "76000000-0",
  rutReceptor: "66666666-6",
  razonSocialReceptor: "Cliente de prueba",
  lineas: [{ orden: 1, glosa: "Cargo", monto: 5_000 }],
};
const creds = { certificadoRut: "11111111-1", certificadoClave: "clave-ficticia" };
const indicador = (p: Parameters<typeof jsonInputGenerarDte>[0]) =>
  (JSON.parse(jsonInputGenerarDte(p, creds)) as { Documento: { Detalles: { IndicadorExento: number }[] } }).Documento.Detalles.map(
    (d) => d.IndicadorExento,
  );

describe("IndicadorExento según los montos del documento", () => {
  it("factura exenta y ND/NC sobre factura exenta: líneas exentas", () => {
    const exentos = { neto: 0, exento: 5_000, iva: 0, total: 5_000 };
    expect(indicador({ ...base, tipoDte: 34, montos: exentos })).toEqual([1]);
    expect(indicador({ ...base, tipoDte: 56, montos: exentos })).toEqual([1]);
    expect(indicador({ ...base, tipoDte: 61, montos: exentos })).toEqual([1]);
  });
  it("factura afecta y ND/NC afectas: líneas afectas", () => {
    const afectos = { neto: 5_000, exento: 0, iva: 950, total: 5_950 };
    expect(indicador({ ...base, tipoDte: 33, montos: afectos })).toEqual([0]);
    expect(indicador({ ...base, tipoDte: 56, montos: afectos })).toEqual([0]);
    expect(indicador({ ...base, tipoDte: 61, montos: afectos })).toEqual([0]);
  });
});
