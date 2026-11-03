// Cliente SimpleAPI v1 (CAR-154). Multipart + Basic; sin secretos en logs.

import type {
  AdaptadorSii,
  AmbienteSii,
  ConsultaSiiResultado,
  DteXmlFirmado,
  EnvioSiiResultado,
  PayloadEmisionDte,
} from "./tipos";
import { adaptadorSiiSimulado } from "./simulado";
import {
  jsonInputGenerarDte,
  SIMPLEAPI_RUTAS,
  type CredencialesSimpleApiV1,
} from "./simpleapi-contrato";
import { blobBase64, blobTexto, leerJsonRespuesta, postMultipartSimpleApi } from "./simpleapi-http";

export type CredencialesSimpleApi = CredencialesSimpleApiV1;

function mapearEstadoConsulta(raw: string | undefined, glosa?: string): ConsultaSiiResultado {
  const e = raw?.trim().toLowerCase() ?? "";
  if (e === "aceptado" || e === "accepted" || e === "dte_aceptado") {
    return { estado: "aceptado", ...(glosa ? { glosa } : {}) };
  }
  if (e === "rechazado" || e === "rejected" || e === "dte_rechazado") {
    return { estado: "rechazado", ...(glosa ? { glosa } : {}) };
  }
  if (e === "reparo" || e === "aceptado con reparos" || e.includes("reparo")) {
    return { estado: "reparo", ...(glosa ? { glosa } : {}) };
  }
  if (e === "pendiente" || e === "enviado" || e === "en_proceso") {
    return { estado: "pendiente", ...(glosa ? { glosa } : {}) };
  }
  return { estado: "pendiente", ...(glosa ? { glosa } : {}) };
}

function extraerTimbre(data: Record<string, unknown>): string {
  const candidatos = [
    data.timbrePdf417,
    data.TimbrePdf417,
    data.pdf417,
    data.PDF417,
    data.ted,
    data.TED,
  ];
  for (const c of candidatos) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  throw new Error("SimpleAPI generar: respuesta sin timbre PDF417.");
}

function extraerXml(data: Record<string, unknown>): string {
  const candidatos = [data.xml, data.XML, data.dte, data.DTE];
  for (const c of candidatos) {
    if (typeof c === "string" && c.includes("<")) return c;
  }
  throw new Error("SimpleAPI generar: respuesta sin XML del DTE.");
}

function extraerTrackId(data: Record<string, unknown>): string {
  const track = data.trackId ?? data.TrackId ?? data.trackID ?? data.TRACKID;
  if (typeof track === "string" && track.length > 0) return track;
  if (typeof track === "number") return String(track);
  throw new Error("SimpleAPI enviar: sin trackId.");
}

/** Adaptador productivo SimpleAPI v1; si faltan credenciales o resolución, queda no disponible. */
export function adaptadorSimpleApi(creds: CredencialesSimpleApi | null): AdaptadorSii {
  const sim = adaptadorSiiSimulado();
  const disponible = Boolean(
    creds?.apiKey &&
      creds.certificadoPfxBase64 &&
      creds.certificadoClave &&
      creds.resolucionNumero > 0 &&
      creds.resolucionFecha,
  );
  return {
    nombre: "simpleapi",
    disponible,
    async firmar(payload: PayloadEmisionDte): Promise<DteXmlFirmado> {
      if (!disponible || !creds) throw new Error("SimpleAPI no configurado.");
      if (!payload.cafXml) throw new Error("SimpleAPI generar: falta el CAF del folio.");
      const input = jsonInputGenerarDte(payload, creds);
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.generar, creds.apiKey, [
        { nombre: "input", valor: input },
        { nombre: "caf", valor: blobTexto(payload.cafXml, "application/xml"), nombreArchivo: "caf.xml" },
        {
          nombre: "certificado",
          valor: blobBase64(creds.certificadoPfxBase64, "application/x-pkcs12"),
          nombreArchivo: "certificado.pfx",
        },
        { nombre: "password", valor: creds.certificadoClave },
        { nombre: "ambiente", valor: payload.ambiente },
      ]);
      const data = await leerJsonRespuesta<Record<string, unknown>>(res);
      return { xml: extraerXml(data), timbrePdf417: extraerTimbre(data) };
    },
    async enviar(xmlFirmado: string, ambiente: AmbienteSii): Promise<EnvioSiiResultado> {
      if (!disponible || !creds) throw new Error("SimpleAPI no configurado.");
      const generarEnvio = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.envioGenerar, creds.apiKey, [
        { nombre: "xml", valor: blobTexto(xmlFirmado, "application/xml"), nombreArchivo: "dte.xml" },
        {
          nombre: "certificado",
          valor: blobBase64(creds.certificadoPfxBase64, "application/x-pkcs12"),
          nombreArchivo: "certificado.pfx",
        },
        { nombre: "password", valor: creds.certificadoClave },
        { nombre: "ambiente", valor: ambiente },
        { nombre: "resolucion", valor: String(creds.resolucionNumero) },
        { nombre: "fechaResolucion", valor: creds.resolucionFecha.slice(0, 10) },
      ]);
      const envioData = await leerJsonRespuesta<Record<string, unknown>>(generarEnvio);
      const xmlEnvio = extraerXml(envioData);
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.envioEnviar, creds.apiKey, [
        { nombre: "xml", valor: blobTexto(xmlEnvio, "application/xml"), nombreArchivo: "envio.xml" },
        { nombre: "ambiente", valor: ambiente },
      ]);
      const data = await leerJsonRespuesta<Record<string, unknown>>(res);
      const trackId = extraerTrackId(data);
      const glosa = typeof data.glosa === "string" ? data.glosa : undefined;
      return { trackId, estado: "enviado", ...(glosa ? { glosa } : {}) };
    },
    async consultar(trackId: string, ambiente: AmbienteSii): Promise<ConsultaSiiResultado> {
      if (!disponible || !creds) return sim.consultar(trackId, ambiente);
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.consultar, creds.apiKey, [
        { nombre: "trackId", valor: trackId },
        { nombre: "ambiente", valor: ambiente },
      ]);
      const data = await leerJsonRespuesta<{ estado?: string; glosa?: string; Estado?: string; Glosa?: string }>(
        res,
      );
      return mapearEstadoConsulta(data.estado ?? data.Estado, data.glosa ?? data.Glosa);
    },
  };
}
