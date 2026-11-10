// Contrato SimpleAPI según su documentación oficial (CAR-196). Las respuestas son los ejemplos publicados en
// https://documentacion.simpleapi.cl; `fetch` se simula y nunca sale a la red.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import consultaOk from "./fixtures/simpleapi-consulta-ok.json";
import enviarOk from "./fixtures/simpleapi-enviar-ok.json";
import { adaptadorSimpleApi, type CredencialesSimpleApi } from "./simpleapi";
import { leerMultipart, textoInput, type ParteLeida } from "./multipart-prueba";
import { mapearConsultaEnvio } from "./simpleapi-consulta";
import { bytesDeXml, xmlDesdeBytes } from "./xml-iso";

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const CLAVE_API = "secreto-de-prueba-de-al-menos-32-caracteres";
/** Basic con usuario «api» y la key como contraseña (CAR-240): base64("api:" + key), nunca la key cruda ni base64(key + ":"). */
const AUTH = `Basic ${Buffer.from(`api:${CLAVE_API}`, "utf8").toString("base64")}`;
const CLAVE_PFX = "Clave-de-prueba-123";
const creds: CredencialesSimpleApi = {
  apiKey: CLAVE_API,
  certificadoPfxBase64: Buffer.from("pfx-falso").toString("base64"),
  certificadoClave: CLAVE_PFX,
  certificadoRut: "17096073-4",
  rutEmpresa: "76269769-6",
  resolucionNumero: 0, // en certificación el SII entrega la resolución número 0 (ejemplos de la documentación)
  resolucionFecha: "2023-01-10",
  actecoEmisor: 801000, // sin ACTECO el adaptador no llama a dte/generar (CAR-240)
};
const payload = {
  ambiente: "certificacion" as const,
  tipoDte: 33 as const,
  folio: 101,
  fechaEmision: "2026-11-06",
  rutEmisor: "76269769-6",
  rutReceptor: "66666666-6",
  razonSocialReceptor: "Compañía Ñuñoa",
  montos: { neto: 1000, exento: 0, iva: 190, total: 1190 },
  lineas: [{ orden: 1, glosa: "Servicio de guardias — mes de noviembre", monto: 1000 }],
  cafXml: "<AUTORIZACION>caf</AUTORIZACION>",
};

type Llamada = { url: string; auth: string | null; partes: ParteLeida[]; input: string };
function simularFetch(respuestas: Record<string, () => Response>) {
  const llamadas: Llamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { headers: Record<string, string>; body: Uint8Array }) => {
      const partes = leerMultipart(init.body, String(init.headers["Content-Type"]));
      llamadas.push({ url, auth: init.headers["Authorization"] ?? null, partes, input: textoInput(partes) });
      const r = respuestas[url];
      if (!r) throw new Error(`Llamada inesperada: ${url}`);
      return r();
    }),
  );
  return llamadas;
}
const xmlLatin1 = (xml: string) => new Response(bytesDeXml(xml), { headers: { "content-type": "application/xml; charset=iso-8859-1" } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
/** Nombre, archivo y tipo de cada parte: el orden y la forma que usa OPAI 1.0 (CAR-240). */
const forma = (l: Llamada | undefined) => l?.partes.map((p) => [p.nombre, p.archivo, p.tipo]);
const PFX = ["file", "certificado.pfx", "application/x-pkcs12"];
const INPUT = ["input", null, "application/json; charset=ISO-8859-1"];
const B = "https://api.simpleapi.cl/api/v1";

afterEach(() => vi.unstubAllGlobals());

describe("firmar (POST dte/generar)", () => {
  it("autentica con Basic api:key, el esquema de 1.0 y los archivos como en 1.0 (input, file PFX, file CAF)", async () => {
    const llamadas = simularFetch({ [`${B}/dte/generar`]: () => xmlLatin1(fixture("simpleapi-generar-factura.xml")) });
    const r = await adaptadorSimpleApi(creds).firmar(payload);
    const [l] = llamadas;
    expect(l?.auth).toBe(AUTH);
    expect(Buffer.from(String(l?.auth).replace(/^Basic /, ""), "base64").toString("utf8")).toBe(`api:${CLAVE_API}`);
    const entrada = JSON.parse(String(l?.input));
    expect(entrada.Documento.Id).toBe("F101T33");
    expect(entrada.Documento.Encabezado.IdentificacionDTE).toMatchObject({ TipoDTE: 33, Folio: 101, FechaEmisionString: "2026-11-06" });
    expect(entrada.Documento.Encabezado.IdentificacionDTE).not.toHaveProperty("FechaEmision");
    expect(entrada.Documento.Encabezado.IdentificacionDTE).not.toHaveProperty("FechaVencimiento"); // sin vencimiento
    expect(entrada.Documento.Detalles[0]).toMatchObject({ NumeroLinea: 1, Nombre: "Servicio de guardias - mes de noviembre" });
    expect(entrada.Documento).not.toHaveProperty("Referencias"); // sin referencias no va la lista vacía
    // input en ISO-8859-1: «ñ» es un byte (0xF1), no los dos de UTF-8.
    expect(entrada.Documento.Encabezado.Receptor.RazonSocial).toBe("Compañía Ñuñoa");
    expect(l?.partes[0]?.bytes.includes(Buffer.from([0xf1]))).toBe(true);
    expect(l?.partes[0]?.bytes.includes(Buffer.from("ñ", "utf8"))).toBe(false);
    expect(entrada.Documento.Encabezado.Emisor.Rut).toBe("76269769-6");
    expect(entrada.Documento.Encabezado.Totales).toMatchObject({ MontoNeto: 1000, IVA: 190, MontoTotal: 1190 });
    expect(entrada.Certificado).toEqual({ Rut: "17096073-4", Password: CLAVE_PFX });
    expect(entrada.Ambiente).toBeUndefined(); // el ambiente solo va en el envío
    expect(forma(l)).toEqual([INPUT, PFX, ["file", "caf.xml", "application/xml"]]);
    expect(l?.partes[1]?.bytes.equals(Buffer.from("pfx-falso"))).toBe(true); // el .pfx en sus bytes, no en base64
    expect(l?.partes[2]?.bytes.equals(bytesDeXml(payload.cafXml))).toBe(true); // el CAF en sus bytes ISO-8859-1
    expect(r.xml).toContain("<DTE");
    expect(r.timbrePdf417.startsWith("<TED")).toBe(true);
    expect(r.timbrePdf417.endsWith("</TED>")).toBe(true);
  });

  it("envía Acteco, dirección y comuna del emisor con los nombres de OPAI 1.0 (ActividadEconomica es lista)", async () => {
    const llamadas = simularFetch({ [`${B}/dte/generar`]: () => xmlLatin1(fixture("simpleapi-generar-factura.xml")) });
    await adaptadorSimpleApi({
      ...creds,
      razonSocialEmisor: "Emisora de Prueba SpA",
      giroEmisor: "Servicios de seguridad",
      actecoEmisor: 801000,
      direccionEmisor: "Calle Falsa 123",
      comunaEmisor: "Providencia",
      ciudadEmisor: "Santiago",
    }).firmar(payload);
    const emisor = JSON.parse(String(llamadas[0]?.input)).Documento.Encabezado.Emisor;
    expect(emisor).toEqual({
      Rut: "76269769-6",
      RazonSocial: "Emisora de Prueba SpA",
      Giro: "Servicios de seguridad",
      ActividadEconomica: [801000],
      DireccionOrigen: "Calle Falsa 123",
      ComunaOrigen: "Providencia",
      CiudadOrigen: "Santiago",
    });
  });

  it("sin más datos del emisor no inventa campos (el ACTECO sí es obligatorio, CAR-240)", async () => {
    const llamadas = simularFetch({ [`${B}/dte/generar`]: () => xmlLatin1(fixture("simpleapi-generar-factura.xml")) });
    await adaptadorSimpleApi(creds).firmar(payload);
    const emisor = JSON.parse(String(llamadas[0]?.input)).Documento.Encabezado.Emisor;
    expect(emisor).toEqual({ Rut: "76269769-6", ActividadEconomica: [801000] });
  });

  it("vencimiento como FechaVencimiento (doc oficial) y, sin ciudad, la comuna real del receptor (CAR-240)", async () => {
    const llamadas = simularFetch({ [`${B}/dte/generar`]: () => xmlLatin1(fixture("simpleapi-generar-factura.xml")) });
    const receptor = { giroReceptor: "SERVICIO PUBLICO", direccionReceptor: "Teatinos 120", comunaReceptor: "Santiago" };
    await adaptadorSimpleApi(creds).firmar({ ...payload, ...receptor, fechaVencimiento: "2026-12-10" });
    const doc = JSON.parse(String(llamadas[0]?.input)).Documento;
    // Emisión con el nombre del SDK que 1.0 usa y emite; vencimiento con el nombre de la doc oficial de Generar - DTE.
    expect(doc.Encabezado.IdentificacionDTE).toMatchObject({
      FechaEmisionString: "2026-11-06",
      FechaVencimiento: "2026-12-10",
      FormaPago: 2,
    });
    expect(doc.Encabezado.IdentificacionDTE).not.toHaveProperty("FechaVencimientoString");
    expect(doc.Encabezado.IdentificacionDTE).not.toHaveProperty("FechaEmision");
    expect(doc.Encabezado.Receptor).toMatchObject({ Comuna: "Santiago", Ciudad: "Santiago", Giro: "SERVICIO PUBLICO" });
    // Con ciudad propia va la ciudad; sin comuna ni ciudad no se inventa ninguna (el preflight ya bloquea).
    await adaptadorSimpleApi(creds).firmar({ ...payload, ...receptor, comunaReceptor: "Providencia", ciudadReceptor: "Santiago" });
    expect(JSON.parse(String(llamadas[1]?.input)).Documento.Encabezado.Receptor).toMatchObject({ Comuna: "Providencia", Ciudad: "Santiago" });
    await adaptadorSimpleApi(creds).firmar(payload);
    expect(JSON.parse(String(llamadas[2]?.input)).Documento.Encabezado.Receptor).not.toHaveProperty("Ciudad");
  });

  it("RUT en formato SII, el RUT del titular como lo extrae 1.0 y CorreoRecep solo con una dirección válida", async () => {
    const llamadas = simularFetch({ [`${B}/dte/generar`]: () => xmlLatin1(fixture("simpleapi-generar-factura.xml")) });
    await adaptadorSimpleApi({ ...creds, certificadoRut: "RUT 17.096.073-4" }).firmar({
      ...payload,
      rutEmisor: "76.269.769-6",
      rutReceptor: "60.803.000-k",
      emailReceptor: "dte@cliente.cl",
    });
    const entrada = JSON.parse(String(llamadas[0]?.input));
    expect(entrada.Documento.Encabezado.Emisor.Rut).toBe("76269769-6");
    expect(entrada.Documento.Encabezado.Receptor).toMatchObject({ Rut: "60803000-K", CorreoRecep: "dte@cliente.cl" });
    expect(entrada.Certificado.Rut).toBe("17096073-4");
    // Sin borde izquierdo, un cuerpo de 9 dígitos no se recorta a sus últimos 8.
    await adaptadorSimpleApi({ ...creds, certificadoRut: "123456789-0" }).firmar(payload);
    expect(JSON.parse(String(llamadas[1]?.input)).Certificado.Rut).toBe("123456789-0");
    await adaptadorSimpleApi(creds).firmar({ ...payload, emailReceptor: "a@b.cl, c@d.cl" });
    expect(JSON.parse(String(llamadas[2]?.input)).Documento.Encabezado.Receptor).not.toHaveProperty("CorreoRecep");
  });

  it("ADR-075: el XML con ñ y tildes vuelve con los mismos bytes ISO-8859-1 y el mismo SHA-256", async () => {
    const original = fixture("simpleapi-generar-factura.xml").replace(
      "RAZÓN SOCIAL",
      "Compañía Ñuñoa Ltda. — glosa con tildes áéíóú",
    );
    const bytesSimpleApi = Buffer.from(original, "latin1");
    simularFetch({ [`${B}/dte/generar`]: () => new Response(bytesSimpleApi) });
    const r = await adaptadorSimpleApi(creds).firmar(payload);
    const bytes = bytesDeXml(r.xml);
    expect(bytes.equals(bytesSimpleApi)).toBe(true);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(createHash("sha256").update(bytesSimpleApi).digest("hex"));
    // Pasarlo por UTF-8 cambiaría los bytes firmados: es lo que ADR-075 prohíbe.
    expect(Buffer.from(r.xml, "utf8").equals(bytesSimpleApi)).toBe(false);
    expect(xmlDesdeBytes(bytes)).toBe(r.xml);
  });

  it("rechaza una respuesta sin timbre o que no es XML, y exige el CAF", async () => {
    simularFetch({ [`${B}/dte/generar`]: () => xmlLatin1("<DTE><Documento/></DTE>") });
    await expect(adaptadorSimpleApi(creds).firmar(payload)).rejects.toThrow(/timbre/);
    simularFetch({ [`${B}/dte/generar`]: () => new Response("Error interno", { status: 200 }) });
    await expect(adaptadorSimpleApi(creds).firmar(payload)).rejects.toThrow(/no es un XML/);
    await expect(adaptadorSimpleApi(creds).firmar({ ...payload, cafXml: undefined as never })).rejects.toThrow(/CAF/);
  });

  it("un error HTTP no filtra la API key ni la clave del certificado", async () => {
    simularFetch({ [`${B}/dte/generar`]: () => new Response("no autorizado", { status: 401 }) });
    const error = await adaptadorSimpleApi(creds).firmar(payload).catch((e: Error) => e);
    expect((error as Error).message).toContain("401");
    expect((error as Error).message).not.toContain(CLAVE_API);
    expect((error as Error).message).not.toContain(CLAVE_PFX);
  });
});

describe("enviar (sobre de envío y envío al SII)", () => {
  const dte = Buffer.from(fixture("simpleapi-generar-factura.xml").replace("RAZÓN SOCIAL", "Compañía Ñuñoa"), "latin1");

  it("genera el sobre con el RUT del SII y lo envía con ambiente y tipo; devuelve el TrackID", async () => {
    const llamadas = simularFetch({
      [`${B}/envio/generar`]: () => xmlLatin1(fixture("simpleapi-envio-dte.xml")),
      [`${B}/envio/enviar`]: () => json(enviarOk),
    });
    const r = await adaptadorSimpleApi(creds).enviar(xmlDesdeBytes(dte), "certificacion");
    expect(llamadas.map((l) => l.url)).toEqual([`${B}/envio/generar`, `${B}/envio/enviar`]);
    const sobre = JSON.parse(String(llamadas[0]?.input));
    expect(sobre.Caratula).toEqual({ RutEmisor: "76269769-6", RutReceptor: "60803000-K", FechaResolucion: "2023-01-10", NumeroResolucion: 0 });
    expect(forma(llamadas[0])).toEqual([INPUT, PFX, ["file", "dte.xml", "application/xml"]]);
    expect(forma(llamadas[1])).toEqual([INPUT, PFX, ["file", "envio.xml", "application/xml"]]);
    expect(llamadas[0]?.partes[2]?.bytes.equals(dte)).toBe(true); // los mismos bytes, sin transcodificar
    expect(JSON.parse(String(llamadas[1]?.input))).toMatchObject({ Ambiente: 0, Tipo: 1 });
    expect(llamadas.every((l) => l.auth === AUTH)).toBe(true); // /envio/generar y /envio/enviar
    expect(r).toMatchObject({ trackId: "183061986", estado: "enviado", glosa: "Upload OK" });
  });

  it("producción manda Ambiente 1; si el SII no recibió el envío, falla sin inventar un TrackID", async () => {
    const llamadas = simularFetch({
      [`${B}/envio/generar`]: () => xmlLatin1(fixture("simpleapi-envio-dte.xml")),
      [`${B}/envio/enviar`]: () => json({ ok: false, trackId: 0, glosa: "Error de firma" }),
    });
    await expect(adaptadorSimpleApi(creds).enviar(xmlDesdeBytes(dte), "produccion")).rejects.toMatchObject({
      motivo: "el SII no recibió el envío",
      detalle: "Error de firma",
    });
    expect(JSON.parse(String(llamadas[1]?.input)).Ambiente).toBe(1);
  });
});

describe("consultar (POST consulta/envio)", () => {
  it("consulta por TrackID con el RUT de la empresa y mapea la respuesta", async () => {
    const llamadas = simularFetch({ [`${B}/consulta/envio`]: () => json(consultaOk) });
    const r = await adaptadorSimpleApi(creds).consultar("183060352", "certificacion");
    expect(llamadas[0]?.auth).toBe(AUTH);
    expect(forma(llamadas[0])).toEqual([INPUT, PFX]);
    expect(JSON.parse(String(llamadas[0]?.input))).toMatchObject({
      RutEmpresa: "76269769-6",
      TrackId: 183060352,
      Ambiente: 0,
      ServidorBoletaREST: false,
    });
    expect(r.estado).toBe("aceptado");
  });

  it("mapea los códigos del SII: solo EPR con todo aceptado es aceptado", () => {
    const xml = (estado: string) => `<SII:RESP_HDR><ESTADO>${estado}</ESTADO><GLOSA>glosa ${estado}</GLOSA></SII:RESP_HDR>`;
    const e = (i: number, a: number, r: number, p: number) => [{ cantidadInformados: i, cantidadAceptados: a, cantidadRechazados: r, cantidadReparos: p }];
    expect(mapearConsultaEnvio({ responseXml: xml("EPR"), estados: e(1, 1, 0, 0) })).toEqual({ estado: "aceptado", glosa: "glosa EPR" });
    expect(mapearConsultaEnvio({ responseXml: xml("EPR"), estados: e(2, 1, 1, 0) }).estado).toBe("rechazado");
    expect(mapearConsultaEnvio({ responseXml: xml("EPR"), estados: e(1, 0, 0, 1) }).estado).toBe("reparo");
    expect(mapearConsultaEnvio({ responseXml: xml("EPR"), estados: [] }).estado).toBe("pendiente");
    for (const c of ["RSC", "RFR", "RCT"]) expect(mapearConsultaEnvio({ responseXml: xml(c) }).estado).toBe("rechazado");
    for (const c of ["SOK", "CRT", "FOK", "PDR", "XYZ"]) expect(mapearConsultaEnvio({ responseXml: xml(c) }).estado).toBe("pendiente");
    expect(mapearConsultaEnvio({}).estado).toBe("pendiente");
  });
});

describe("disponibilidad", () => {
  it("sin credenciales completas no está disponible y no llama a la red", async () => {
    const llamadas = simularFetch({});
    for (const c of [null, { ...creds, apiKey: "" }, { ...creds, certificadoRut: "" }, { ...creds, rutEmpresa: "" }]) {
      const a = adaptadorSimpleApi(c);
      expect(a.disponible).toBe(false);
      await expect(a.firmar(payload)).rejects.toThrow(/no está configurada/);
    }
    expect(llamadas).toHaveLength(0);
    expect(adaptadorSimpleApi(creds).disponible).toBe(true); // resolución 0 es válida en certificación
  });
});

describe("referencias del DTE (CAR-221 · A1)", () => {
  const entrada = async (p: typeof payload & { referencias?: unknown }) => {
    const llamadas = simularFetch({ [`${B}/dte/generar`]: () => xmlLatin1(fixture("simpleapi-generar-factura.xml")) });
    await adaptadorSimpleApi(creds).firmar(p as never);
    const input = JSON.parse(String(llamadas[0]?.input));
    return input.Documento.Referencias as Record<string, unknown>[];
  };

  it("usa la fecha del documento referenciado y no pone CodRef en una factura (OC 801)", async () => {
    const [ref] = await entrada({ ...payload, referencias: [{ tipoDte: 801, folio: 4500, fecha: "2026-10-15" }] });
    expect(ref).toMatchObject({ Numero: 1, TipoDocumento: "801", FolioReferencia: "4500", FechaDocumentoReferenciaString: "2026-10-15" });
    expect(ref).not.toHaveProperty("FechaDocumentoReferencia");
    expect(ref).not.toHaveProperty("CodigoReferencia");
  });

  it("en una nota de crédito conserva CodRef y la fecha de la factura anulada", async () => {
    const [ref] = await entrada({ ...payload, referencias: [{ tipoDte: 33, folio: 77, fecha: "2026-09-30", codigo: 1, razon: "Anula" }] });
    expect(ref).toMatchObject({ TipoDocumento: "33", FechaDocumentoReferenciaString: "2026-09-30", CodigoReferencia: 1, RazonReferencia: "Anula" });
  });

  it("sin fecha (filas anteriores) cae a la de emisión", async () => {
    const [ref] = await entrada({ ...payload, referencias: [{ tipoDte: 801, folio: 1 }] });
    expect(ref?.["FechaDocumentoReferenciaString"]).toBe("2026-11-06");
  });
});
