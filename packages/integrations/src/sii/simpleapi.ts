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
import { detalleSeguroDeRespuesta, ErrorProveedorSii, type PasoProveedorSii } from "./error-proveedor";
import { extraerTed, xmlDesdeBytes } from "./xml-iso";

export type CredencialesSimpleApi = CredencialesSimpleApiV1;

const PFX = "application/x-pkcs12";

/** Quita un BOM UTF-8 (EF BB BF, leído como latin1) que algunos servidores anteponen al XML. */
const sinBom = (xml: string) => (xml.startsWith("\u00ef\u00bb\u00bf") ? xml.slice(3) : xml);

function exigirXml(xml: string, paso: PasoProveedorSii): string {
  const x = sinBom(xml);
  if (!x.trimStart().startsWith("<")) throw new ErrorProveedorSii(paso, "la respuesta no es un XML de DTE");
  return x;
}

function rutEmisorDeXml(xml: string): string {
  const m = /<RUTEmisor>([^<]+)<\/RUTEmisor>/.exec(xml);
  if (!m?.[1]) throw new ErrorProveedorSii("sobre de envío", "el DTE firmado no trae RUT emisor");
  return m[1].trim();
}

/** Valores propios que nunca pueden salir en el detalle de un error (CAR-242). */
const secretosDe = (c: CredencialesSimpleApi) => [c.apiKey, c.certificadoClave];

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
      if (!disponible || !creds) throw new ErrorProveedorSii("generar", "la integración no está configurada");
      if (!payload.cafXml) throw new ErrorProveedorSii("generar", "falta el CAF del folio");
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.generar, creds.apiKey, [
        { nombre: "input", valor: jsonInputGenerarDte(payload, creds) },
        { nombre: "files", valor: certificado(creds), nombreArchivo: "certificado.pfx" },
        { nombre: "files2", valor: new Blob([payload.cafXml], { type: "application/xml" }), nombreArchivo: "caf.xml" },
      ]);
      const xml = exigirXml(xmlDesdeBytes(await leerBytesRespuesta(res, "generar", secretosDe(creds))), "generar");
      const ted = extraerTed(xml);
      if (!ted) throw new ErrorProveedorSii("generar", "el DTE generado no trae timbre electrónico");
      return { xml, timbrePdf417: ted };
    },
    async enviar(xmlFirmado: string, ambiente: AmbienteSii): Promise<EnvioSiiResultado> {
      if (!disponible || !creds) throw new ErrorProveedorSii("enviar", "la integración no está configurada");
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
      const xmlSobre = exigirXml(xmlDesdeBytes(await leerBytesRespuesta(sobre, "sobre de envío", secretosDe(creds))), "sobre de envío");
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.envioEnviar, creds.apiKey, [
        { nombre: "input", valor: jsonInputEnviarSii(ambiente, creds) },
        { nombre: "files", valor: certificado(creds), nombreArchivo: "certificado.pfx" },
        { nombre: "files2", valor: blobXml(xmlSobre), nombreArchivo: "envio.xml" },
      ]);
      const data = await leerJsonRespuesta<RespuestaEnviar>(res, "enviar", secretosDe(creds));
      const glosa = typeof data.glosa === "string" && data.glosa ? data.glosa : undefined;
      if (data.ok === false || data.trackId == null || String(data.trackId) === "0") {
        const detalle = glosa ? detalleSeguroDeRespuesta(glosa, secretosDe(creds)) : null;
        throw new ErrorProveedorSii("enviar", "el SII no recibió el envío", undefined, detalle);
      }
      return { trackId: String(data.trackId), estado: "enviado", ...(glosa ? { glosa } : {}) };
    },
    async consultar(trackId: string, ambiente: AmbienteSii): Promise<ConsultaSiiResultado> {
      if (!disponible || !creds) return sim.consultar(trackId, ambiente);
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.consultaEnvio, creds.apiKey, [
        { nombre: "input", valor: jsonInputConsultaEnvio(creds.rutEmpresa, trackId, ambiente, creds) },
        { nombre: "files", valor: certificado(creds), nombreArchivo: "certificado.pfx" },
      ]);
      return mapearConsultaEnvio(await leerJsonRespuesta<RespuestaConsultaEnvio>(res, "consultar", secretosDe(creds)));
    },
  };
}
