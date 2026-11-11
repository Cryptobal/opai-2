// CAR-240 · La petición de POST dte/generar comparada con la de OPAI 1.0, que sí emite con SimpleAPI. Sin red y sin
// secretos reales: PFX falso, CAF ASCII sintético y clave ASCII. El contrato de 1.0 se afirma con sus claves (no se
// copia su código): `buildDtePayload` y `generarDteXml` de `src/modules/finance/shared/adapters/simpleapi.provider.ts`
// de Cryptobal/opai (revisado el 11-nov-2026, commit c13b49e).
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorProveedorSii } from "./error-proveedor";
import { leerMultipart, textoInput, type ParteLeida } from "./multipart-prueba";
import { adaptadorSimpleApi, type CredencialesSimpleApi } from "./simpleapi";

/** Claves que arma `buildDtePayload` de 1.0 para una 33 afecta con emisor y receptor completos. */
const CLAVES_1X = {
  raiz: ["Certificado", "Documento"],
  documento: ["Detalles", "Encabezado", "Id"],
  encabezado: ["Emisor", "IdentificacionDTE", "Receptor", "Totales"],
  // 1.0 agrega `FormaPago` solo si se pide; OPAI 2.0 lo informa siempre (crédito, decisión de Carlos).
  identificacion: ["FechaEmisionString", "Folio", "FormaPago", "TipoDTE"],
  emisor: ["ActividadEconomica", "CiudadOrigen", "ComunaOrigen", "DireccionOrigen", "Giro", "RazonSocial", "Rut"],
  receptor: ["Ciudad", "Comuna", "CorreoRecep", "Direccion", "Giro", "RazonSocial", "Rut"],
  totales: ["IVA", "MontoExento", "MontoNeto", "MontoTotal", "TasaIVA"],
  detalle: ["Cantidad", "MontoItem", "Nombre", "NumeroLinea", "Precio"],
  certificado: ["Password", "Rut"],
} as const;

/** PFX falso: empieza por 0x30 (SEQUENCE DER) como un PKCS#12 real y trae bytes no ASCII. */
const PFX = Buffer.from([0x30, 0x82, 0x0e, 0x3a, 0x02, 0x01, 0x03, 0xff, 0x80, 0xc3, 0xa9]);
const PFX_BASE64 = PFX.toString("base64");
const CAF = '<?xml version="1.0"?><AUTORIZACION><CAF version="1.0"><DA><RE>76111222-8</RE><TD>33</TD></DA></CAF></AUTORIZACION>';
const CLAVE_API = "api-key-sintetica-de-prueba-0000000000";
const CLAVE_PFX = "Clave-Ascii-123";

const creds: CredencialesSimpleApi = {
  apiKey: CLAVE_API,
  certificadoPfxBase64: PFX_BASE64,
  certificadoClave: CLAVE_PFX,
  // serialNumber con prefijo y puntos: `Certificado.Rut` debe salir 12345678-9.
  certificadoRut: "RUT 12.345.678-9",
  rutEmpresa: "76111222-8",
  resolucionNumero: 0,
  resolucionFecha: "2024-04-22",
  razonSocialEmisor: "Emisora Sintetica SpA",
  giroEmisor: "Servicios",
  actecoEmisor: 801000,
  direccionEmisor: "Calle Ficticia 1",
  comunaEmisor: "Providencia",
  ciudadEmisor: "Santiago",
};

const payload = {
  ambiente: "certificacion" as const,
  tipoDte: 33 as const,
  folio: 102,
  fechaEmision: "2026-11-10",
  fechaVencimiento: "2026-12-10",
  rutEmisor: "76.111.222-8",
  rutReceptor: "60803000-K",
  razonSocialReceptor: "Receptor Sintetico",
  giroReceptor: "Servicios",
  direccionReceptor: "Calle 2",
  comunaReceptor: "Santiago",
  ciudadReceptor: "Santiago",
  emailReceptor: "dte@receptor.cl",
  montos: { neto: 10_000, exento: 0, iva: 1_900, total: 11_900 },
  lineas: [{ orden: 1, glosa: "Servicio", monto: 10_000 }],
  cafXml: CAF,
};

/** 401 vacío con headers de cupo (SimpleAPI los envía siempre; CAR-263), como el de las 20:43 del 10-nov-2026. */
const respuesta401Vacia = () =>
  new Response(null, {
    status: 401,
    headers: { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39", "content-length": "0" },
  });

function capturar(respuesta: () => Response): { partes: ParteLeida[] }[] {
  const llamadas: { partes: ParteLeida[] }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { headers: Record<string, string>; body: Uint8Array }) => {
      llamadas.push({ partes: leerMultipart(init.body, String(init.headers["Content-Type"])) });
      return respuesta();
    }),
  );
  return llamadas;
}

const claves = (o: object) => Object.keys(o).sort();

afterEach(() => vi.unstubAllGlobals());

describe("dte/generar igual a OPAI 1.0 (CAR-240)", () => {
  it("multipart: input, file certificado.pfx (bytes del base64) y file caf.xml (bytes latin1), en ese orden", async () => {
    const llamadas = capturar(respuesta401Vacia);
    await expect(adaptadorSimpleApi(creds).firmar(payload)).rejects.toBeInstanceOf(ErrorProveedorSii);
    const partes = llamadas[0]?.partes ?? [];
    expect(partes.map((p) => [p.nombre, p.archivo, p.tipo])).toEqual([
      ["input", null, "application/json; charset=ISO-8859-1"],
      ["file", "certificado.pfx", "application/x-pkcs12"],
      ["file", "caf.xml", "application/xml"],
    ]);
    expect(partes[1]?.bytes.equals(Buffer.from(PFX_BASE64, "base64"))).toBe(true);
    expect(partes[1]?.bytes.equals(Buffer.from(PFX_BASE64, "utf8"))).toBe(false); // nunca el texto del base64
    expect(partes[2]?.bytes.equals(Buffer.from(CAF, "latin1"))).toBe(true);
  });

  it("input con las claves de buildDtePayload de 1.0, sin vencimiento, con FormaPago y el RUT del titular normalizado", async () => {
    const llamadas = capturar(respuesta401Vacia);
    await expect(adaptadorSimpleApi(creds).firmar(payload)).rejects.toThrow();
    const entrada = JSON.parse(textoInput(llamadas[0]?.partes ?? []));
    const doc = entrada.Documento;
    expect(claves(entrada)).toEqual(CLAVES_1X.raiz);
    expect(claves(doc)).toEqual(CLAVES_1X.documento);
    expect(claves(doc.Encabezado)).toEqual(CLAVES_1X.encabezado);
    expect(claves(doc.Encabezado.IdentificacionDTE)).toEqual(CLAVES_1X.identificacion);
    expect(claves(doc.Encabezado.Emisor)).toEqual(CLAVES_1X.emisor);
    expect(claves(doc.Encabezado.Receptor)).toEqual(CLAVES_1X.receptor);
    expect(claves(doc.Encabezado.Totales)).toEqual(CLAVES_1X.totales);
    expect(claves(doc.Detalles[0])).toEqual(CLAVES_1X.detalle);
    expect(claves(entrada.Certificado)).toEqual(CLAVES_1X.certificado);
    const id = doc.Encabezado.IdentificacionDTE;
    expect(id).toEqual({ TipoDTE: 33, Folio: 102, FechaEmisionString: "2026-11-10", FormaPago: 2 });
    expect(id).not.toHaveProperty("FechaVencimiento");
    expect(id).not.toHaveProperty("FechaVencimientoString");
    // El titular del certificado (persona), nunca el RUT de la empresa.
    expect(entrada.Certificado).toEqual({ Rut: "12345678-9", Password: CLAVE_PFX });
    expect(entrada.Certificado.Rut).not.toBe(doc.Encabezado.Emisor.Rut);
    expect(doc.Encabezado.Emisor.Rut).toBe("76111222-8");
  });

  it("un 401 vacío deja un diagnóstico seguro de la respuesta y de la petición, sin secretos ni contenido", async () => {
    capturar(respuesta401Vacia);
    const error = await adaptadorSimpleApi(creds).firmar(payload).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorProveedorSii);
    if (!(error instanceof ErrorProveedorSii)) return;
    expect(error.status).toBe(401);
    expect(error.motivo).toContain("respondió HTTP 401 sin motivo, como ante una API key que no reconoce");
    expect(error.cuerpo).toBe("vacio");
    expect(error.respuesta).toEqual({ contentType: null, contentLength: "0", cuerpoLargo: 0, detalleLargo: null });
    expect(error.peticion).toEqual({
      pfxBytes: PFX.length,
      pfxDer: true,
      cafBytes: Buffer.byteLength(CAF, "latin1"),
      cafFormato: "ascii",
      certificadoRutValido: true,
      clavesIdentificacionDte: ["TipoDTE", "Folio", "FechaEmisionString", "FormaPago"],
    });
    const log = JSON.stringify({ r: error.respuesta, p: error.peticion, m: error.motivoSeguro });
    for (const prohibido of [CLAVE_API, CLAVE_PFX, PFX_BASE64, "AUTORIZACION", "76111222", "12345678"]) {
      expect(log).not.toContain(prohibido);
    }
  });

  it("con un motivo en el cuerpo anota solo el largo del detalle y el content-type saneado", async () => {
    capturar(
      () =>
        new Response(JSON.stringify({ mensaje: `Clave ${CLAVE_PFX} incorrecta` }), {
          status: 401,
          headers: { "content-type": "Application/JSON; charset=utf-8", "x-rate-limit-limit": "1m" },
        }),
    );
    const error = await adaptadorSimpleApi(creds).firmar(payload).catch((e: unknown) => e);
    if (!(error instanceof ErrorProveedorSii)) throw new Error("se esperaba ErrorProveedorSii");
    // El saneador quita la clave y toda palabra contenida en ella («Clave»): mejor perder fidelidad que un secreto.
    expect(error.detalle).toBe("incorrecta");
    expect(error.respuesta).toMatchObject({ contentType: "application/json; charset=utf-8", detalleLargo: 10 });
    expect(JSON.stringify(error.respuesta)).not.toContain("incorrecta");
    expect(JSON.stringify(error.respuesta)).not.toContain(CLAVE_PFX);
  });
});
