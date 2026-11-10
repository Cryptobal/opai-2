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
  it("HTTP 400 con mensaje JSON: estado fijo para el log y detalle legible solo para la persona", async () => {
    generar(() => new Response(JSON.stringify({ mensaje: "Receptor 12.345.678-5 Juan Perez no autorizado" }), { status: 400 }));
    const e = await firmarError();
    expect(e).toBeInstanceOf(ErrorProveedorSii);
    expect(e).toMatchObject({ paso: "generar", status: 400, motivo: "respondió HTTP 400" });
    expect(e.detalle).toBe("Receptor 12.345.678-5 Juan Perez no autorizado");
    // El log (motivoSeguro y message) nunca lleva texto del proveedor ni datos del documento.
    expect(e.motivoSeguro).toBe("SimpleAPI generar: respondió HTTP 400");
    expect(e.message).toBe(e.motivoSeguro);
  });
  it("el detalle nunca trae los secretos propios ni caracteres de control", async () => {
    const eco = `Autorizacion invalida ${CLAVE_API} clave ${CLAVE_PFX}\u202e\u0000 fin`;
    generar(() => new Response(JSON.stringify({ mensaje: eco }), { status: 401 }));
    const e = await firmarError();
    for (const s of [CLAVE_API, CLAVE_PFX, "\u202e", "\u0000"]) expect(e.detalle ?? "").not.toContain(s);
    expect(e.detalle).toBe("Autorizacion invalida clave fin");
  });
  it("redacta todo secreto no vacío, aunque sea corto o venga con caracteres invisibles intercalados", () => {
    expect(detalleSeguroDeRespuesta(JSON.stringify({ mensaje: "Clave incorrecta 123" }), ["123"])).toBe("Clave incorrecta");
    expect(detalleSeguroDeRespuesta(JSON.stringify({ mensaje: "Clave incorrecta x" }), ["x"])).toBe("Clave incorrecta");
    expect(detalleSeguroDeRespuesta("Clave incorrecta 1\u200b23 rechazada", ["123"])).toBe("Clave incorrecta rechazada");
  });
  it("un 5xx o una respuesta ilegible del envío quedan como inciertos (pudo haber llegado al SII)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/envio/generar")
          ? new Response(bytesDeXml("<EnvioDTE/>"))
          : new Response("Bad gateway", { status: 502 }),
      ),
    );
    const xml = "<DTE><RUTEmisor>76000000-0</RUTEmisor></DTE>";
    const e = (await adaptadorSimpleApi(creds).enviar(xml, "certificacion").catch((x: unknown) => x)) as ErrorProveedorSii;
    expect(e).toMatchObject({ paso: "enviar", status: 502, incierto: true });
  });
  it("HTTP 500 con HTML o XML: solo el estado, nunca el cuerpo", async () => {
    generar(() => new Response("<html><body>Stack trace con datos</body></html>", { status: 500 }));
    const e = await firmarError();
    expect([e.motivo, e.detalle]).toEqual(["respondió HTTP 500", null]);
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

describe("autenticación y límites de uso (CAR-240)", () => {
  it("el header es Basic api:key con la key recortada, nunca la key cruda", async () => {
    const { encabezadoAuthSimpleApi } = await import("./simpleapi-contrato");
    const h = encabezadoAuthSimpleApi(`  ${CLAVE_API}\n`);
    expect(h).toBe(`Basic ${Buffer.from(`api:${CLAVE_API}`, "utf8").toString("base64")}`);
    expect(h).not.toContain(CLAVE_API);
    expect(h).not.toBe(`Basic ${Buffer.from(`${CLAVE_API}:`, "utf8").toString("base64")}`);
  });
  it("un 401 lleva al error los headers x-rate-limit-* saneados, sin otros headers", async () => {
    const headers = {
      "x-rate-limit-limit": "1000",
      "x-rate-limit-remaining": "0",
      "x-rate-limit-reset": "2026-11-10T15:00:00Z",
      "retry-after": "60",
      "x-api-key-echo": CLAVE_API,
      "set-cookie": "sesion=abc",
    };
    generar(() => new Response("no autorizado", { status: 401, headers }));
    const e = await firmarError();
    expect(e.limites).toEqual({
      "x-rate-limit-limit": "1000",
      "x-rate-limit-remaining": "0",
      "x-rate-limit-reset": "2026-11-10T15:00:00Z",
      "retry-after": "60",
    });
    expect(JSON.stringify(e.limites)).not.toContain(CLAVE_API);
  });
  it("401 con x-rate-limit-*: la key autenticó y lo rechazado es el contenido (como 1.0), sin secretos", async () => {
    const headers = { "x-rate-limit-remaining": "39" };
    generar(() => new Response(JSON.stringify({ mensaje: `clave ${CLAVE_PFX}` }), { status: 401, headers }));
    const e = await firmarError();
    expect(e.motivo).toBe("rechazó el contenido (certificado, CAF o datos), HTTP 401");
    expect(e.motivoSeguro).toBe("SimpleAPI generar: rechazó el contenido (certificado, CAF o datos), HTTP 401");
    for (const s of [CLAVE_API, CLAVE_PFX]) expect(`${e.motivoSeguro} ${e.detalle ?? ""}`).not.toContain(s);
  });
  it("401 o 403 sin x-rate-limit-*: la key no fue reconocida", async () => {
    for (const status of [401, 403]) {
      generar(() => new Response("", { status }));
      expect((await firmarError()).motivo).toBe(`no reconoció la API key, HTTP ${status}`);
    }
  });
  it("400 o 422 con x-rate-limit-*: contenido rechazado; 400 sin ellos queda como estado HTTP", async () => {
    for (const status of [400, 422]) {
      generar(() => new Response("", { status, headers: { "x-ratelimit-remaining": "10" } }));
      expect((await firmarError()).motivo).toBe(`rechazó el contenido (certificado, CAF o datos), HTTP ${status}`);
    }
    generar(() => new Response("", { status: 400, headers: { "retry-after": "5" } }));
    expect((await firmarError()).motivo).toBe("respondió HTTP 400");
  });
});
