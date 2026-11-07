// Cliente SimpleAPI REST (CAR-196). Sigue su documentación oficial: generar DTE → sobre de envío → enviar al SII →
// consultar por TrackId. Multipart con la API key en `Authorization`; el XML viaja como bytes ISO-8859-1 (ADR-075);
// nunca registra secretos ni el cuerpo completo de una respuesta.

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
  jsonInputConsultaEnvio,
  jsonInputEnviarSii,
  jsonInputGenerarDte,
  jsonInputSobreEnvio,
  SIMPLEAPI_RUTAS,
  type CredencialesSimpleApiV1,
} from "./simpleapi-contrato";
import { mapearConsultaEnvio, type RespuestaConsultaEnvio } from "./simpleapi-consulta";
import {
  blobBase64,
  blobXml,
  leerBytesRespuesta,
  leerJsonRespuesta,
  postMultipartSimpleApi,
} from "./simpleapi-http";
import { extraerTed, xmlDesdeBytes } from "./xml-iso";

export type CredencialesSimpleApi = CredencialesSimpleApiV1;

const PFX = "application/x-pkcs12";

function exigirXml(xml: string, que: string): string {
  if (!xml.trimStart().startsWith("<")) throw new Error(`SimpleAPI ${que}: la respuesta no es un XML.`);
  return xml;
}

function rutEmisorDeXml(xml: string): string {
  const m = /<RUTEmisor>([^<]+)<\/RUTEmisor>/.exec(xml);
  if (!m?.[1]) throw new Error("SimpleAPI sobre de envío: el DTE no trae RUTEmisor.");
  return m[1].trim();
}

type RespuestaEnviar = { ok?: boolean; trackId?: number | string; glosa?: string; estado?: string; errores?: unknown };

/** Adaptador SimpleAPI; sin credenciales completas queda no disponible. */
export function adaptadorSimpleApi(creds: CredencialesSimpleApi | null): AdaptadorSii {
  const sim = adaptadorSiiSimulado();
  const disponible = Boolean(
    creds?.apiKey &&
      creds.certificadoPfxBase64 &&
      creds.certificadoClave &&
      creds.certificadoRut &&
      creds.rutEmpresa &&
      Number.isInteger(creds.resolucionNumero) &&
      creds.resolucionNumero >= 0 &&
      creds.resolucionFecha,
  );
  const certificado = (c: CredencialesSimpleApi) => blobBase64(c.certificadoPfxBase64, PFX);
  return {
    nombre: "simpleapi",
    disponible,
    async firmar(payload: PayloadEmisionDte): Promise<DteXmlFirmado> {
      if (!disponible || !creds) throw new Error("SimpleAPI no configurado.");
      if (!payload.cafXml) throw new Error("SimpleAPI generar: falta el CAF del folio.");
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.generar, creds.apiKey, [
        { nombre: "input", valor: jsonInputGenerarDte(payload, creds) },
        { nombre: "files", valor: certificado(creds), nombreArchivo: "certificado.pfx" },
        { nombre: "files2", valor: new Blob([payload.cafXml], { type: "application/xml" }), nombreArchivo: "caf.xml" },
      ]);
      const xml = exigirXml(xmlDesdeBytes(await leerBytesRespuesta(res)), "generar");
      const ted = extraerTed(xml);
      if (!ted) throw new Error("SimpleAPI generar: el DTE no trae timbre (TED).");
      return { xml, timbrePdf417: ted };
    },
    async enviar(xmlFirmado: string, ambiente: AmbienteSii): Promise<EnvioSiiResultado> {
      if (!disponible || !creds) throw new Error("SimpleAPI no configurado.");
      const sobre = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.envioGenerar, creds.apiKey, [
        {
          nombre: "input",
          valor: jsonInputSobreEnvio(
            { rutEmisor: rutEmisorDeXml(xmlFirmado), resolucionNumero: creds.resolucionNumero, resolucionFecha: creds.resolucionFecha },
            creds,
          ),
        },
        { nombre: "files", valor: certificado(creds), nombreArchivo: "certificado.pfx" },
        { nombre: "files2", valor: blobXml(xmlFirmado), nombreArchivo: "dte.xml" },
      ]);
      const xmlSobre = exigirXml(xmlDesdeBytes(await leerBytesRespuesta(sobre)), "sobre de envío");
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.envioEnviar, creds.apiKey, [
        { nombre: "input", valor: jsonInputEnviarSii(ambiente, creds) },
        { nombre: "files", valor: certificado(creds), nombreArchivo: "certificado.pfx" },
        { nombre: "files2", valor: blobXml(xmlSobre), nombreArchivo: "envio.xml" },
      ]);
      const data = await leerJsonRespuesta<RespuestaEnviar>(res);
      const glosa = typeof data.glosa === "string" && data.glosa ? data.glosa : undefined;
      if (data.ok === false || data.trackId == null || String(data.trackId) === "0") {
        throw new Error(`SimpleAPI enviar: el SII no recibió el envío${glosa ? ` (${glosa})` : ""}.`);
      }
      return { trackId: String(data.trackId), estado: "enviado", ...(glosa ? { glosa } : {}) };
    },
    async consultar(trackId: string, ambiente: AmbienteSii): Promise<ConsultaSiiResultado> {
      if (!disponible || !creds) return sim.consultar(trackId, ambiente);
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.consultaEnvio, creds.apiKey, [
        { nombre: "input", valor: jsonInputConsultaEnvio(creds.rutEmpresa, trackId, ambiente, creds) },
        { nombre: "files", valor: certificado(creds), nombreArchivo: "certificado.pfx" },
      ]);
      return mapearConsultaEnvio(await leerJsonRespuesta<RespuestaConsultaEnvio>(res));
    },
  };
}
