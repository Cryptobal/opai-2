// CAR-242: los fallos de SimpleAPI son errores tipados con un motivo saneado (sin secretos, XML, CAF ni comillas).
// `fetch` se simula y nunca sale a la red; sin datos reales.
import { afterEach, describe, expect, it, vi } from "vitest";

import { detalleSeguroDeRespuesta, ErrorProveedorSii } from "./error-proveedor";
import { adaptadorSimpleApi, type CredencialesSimpleApi } from "./simpleapi";
import { bytesDeXml } from "./xml-iso";

const CLAVE_API = "secreto-de-prueba-de-al-menos-32-caracteres";
const CLAVE_PFX = "Clave-de-prueba-123";
const creds: CredencialesSimpleApi = {
  apiKey: CLAVE_API,
  certificadoPfxBase64: Buffer.from("pfx-falso").toString("base64"),
  certificadoClave: CLAVE_PFX,
  certificadoRut: "11111111-1",
  rutEmpresa: "76000000-0",
  resolucionNumero: 0,
  resolucionFecha: "2024-01-01",
};
const payload = {
  ambiente: "certificacion" as const,
  tipoDte: 33 as const,
  folio: 7,
  fechaEmision: "2026-11-10",
  rutEmisor: "76000000-0",
  rutReceptor: "66666666-6",
  razonSocialReceptor: "Cliente de prueba",
  montos: { neto: 1000, exento: 0, iva: 190, total: 1190 },
  lineas: [{ orden: 1, glosa: "Servicio", monto: 1000 }],
  cafXml: "<AUTORIZACION><CAF>caf-secreto-de-prueba</CAF></AUTORIZACION>",
};
const generar = (r: () => Response) =>
  vi.stubGlobal("fetch", vi.fn(async () => r()));
const firmarError = async () => (await adaptadorSimpleApi(creds).firmar(payload).catch((e: unknown) => e)) as ErrorProveedorSii;

afterEach(() => vi.unstubAllGlobals());

describe("errores tipados de SimpleAPI (CAR-242)", () => {
  it("HTTP 400 con mensaje JSON: estado y motivo legible, sin secretos ni CAF", async () => {
    generar(() => new Response(JSON.stringify({ mensaje: "Rut receptor no valido" }), { status: 400 }));
    const e = await firmarError();
    expect(e).toBeInstanceOf(ErrorProveedorSii);
    expect(e).toMatchObject({ paso: "generar", status: 400, motivo: "respondió HTTP 400 (Rut receptor no valido)" });
    for (const s of [CLAVE_API, CLAVE_PFX, "caf-secreto", "<", '"']) expect(e.motivoSeguro).not.toContain(s);
  });
  it("HTTP 500 con HTML o XML: solo el estado, nunca el cuerpo", async () => {
    generar(() => new Response("<html><body>Stack trace con datos</body></html>", { status: 500 }));
    expect((await firmarError()).motivo).toBe("respondió HTTP 500");
  });
  it("un detalle con palabras técnicas o tokens largos se descarta", () => {
    expect(detalleSeguroDeRespuesta(JSON.stringify({ message: "Invalid input: Password null" }))).toBeNull();
    expect(detalleSeguroDeRespuesta("Firma inválida MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvbase")).toBe("Firma inválida");
  });
  it("respuesta que no es XML, sin timbre o sin CAF: motivo claro y tipado", async () => {
    generar(() => new Response("Error interno", { status: 200 }));
    expect((await firmarError()).motivo).toBe("la respuesta no es un XML de DTE");
    generar(() => new Response(bytesDeXml("<DTE><Documento/></DTE>")));
    expect((await firmarError()).motivo).toBe("el DTE generado no trae timbre electrónico");
    const sinCaf = await adaptadorSimpleApi(creds).firmar({ ...payload, cafXml: undefined as never }).catch((e: unknown) => e);
    expect(sinCaf).toMatchObject({ paso: "generar", motivo: "falta el CAF del folio" });
  });
  it("acepta un XML con BOM UTF-8 al inicio", async () => {
    const ted = "<TED version=\"1.0\"><DD/></TED>";
    generar(() => new Response(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytesDeXml(`<DTE>${ted}</DTE>`)])));
    const r = await adaptadorSimpleApi(creds).firmar(payload);
    expect(r.xml.startsWith("<DTE>")).toBe(true);
    expect(r.timbrePdf417).toBe(ted);
  });
});
