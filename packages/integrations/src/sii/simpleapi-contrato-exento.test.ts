// CAR-234 / CAR-240 · Líneas y totales de un documento exento, con la forma de OPAI 1.0 (que sí emite): la factura
// exenta (34) y las líneas afectas no llevan IndicadorExento; una NC o ND sobre una factura exenta sí lo lleva en 1
// (sus totales vienen sin neto ni IVA). Sin red: solo el JSON que se enviaría a SimpleAPI.
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
type Doc = { Encabezado: { Totales: Record<string, number> }; Detalles: Record<string, unknown>[] };
const documento = (p: Parameters<typeof jsonInputGenerarDte>[0]) =>
  (JSON.parse(jsonInputGenerarDte(p, creds)) as { Documento: Doc }).Documento;
const indicador = (p: Parameters<typeof jsonInputGenerarDte>[0]) => documento(p).Detalles.map((d) => d["IndicadorExento"]);
const exentos = { neto: 0, exento: 5_000, iva: 0, total: 5_000 };
const afectos = { neto: 5_000, exento: 0, iva: 950, total: 5_950 };

describe("IndicadorExento según los montos del documento", () => {
  it("ND/NC sobre factura exenta: líneas exentas; la factura exenta no lo informa (como 1.0)", () => {
    expect(indicador({ ...base, tipoDte: 34, montos: exentos })).toEqual([undefined]);
    expect(indicador({ ...base, tipoDte: 56, montos: exentos })).toEqual([1]);
    expect(indicador({ ...base, tipoDte: 61, montos: exentos })).toEqual([1]);
  });
  it("factura afecta y ND/NC afectas: sin IndicadorExento", () => {
    for (const tipoDte of [33, 56, 61] as const) expect(indicador({ ...base, tipoDte, montos: afectos })).toEqual([undefined]);
  });
});

describe("totales como OPAI 1.0", () => {
  it("documento exento: MontoExento sin tasa ni IVA", () => {
    expect(documento({ ...base, tipoDte: 34, montos: exentos }).Encabezado.Totales).toEqual({
      MontoNeto: 0,
      MontoExento: 5_000,
      MontoTotal: 5_000,
    });
  });
  it("documento afecto: MontoExento en 0, tasa 19 e IVA", () => {
    expect(documento({ ...base, tipoDte: 33, montos: afectos }).Encabezado.Totales).toEqual({
      MontoNeto: 5_000,
      MontoExento: 0,
      TasaIVA: 19,
      IVA: 950,
      MontoTotal: 5_950,
    });
  });
});
