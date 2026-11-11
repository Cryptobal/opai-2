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
  entradaGenerarDte,
  jsonInputConsultaEnvio,
  jsonInputEnviarSii,
  jsonInputSobreEnvio,
  SIMPLEAPI_RUTAS,
  type CredencialesSimpleApiV1,
} from "./simpleapi-contrato";
import { mapearConsultaEnvio, type RespuestaConsultaEnvio } from "./simpleapi-consulta";
import {
  archivoPfx,
  archivoXml,
  leerBytesRespuesta,
  leerJsonRespuesta,
  postMultipartSimpleApi,
} from "./simpleapi-http";
import { detalleSeguroDeRespuesta, ErrorProveedorSii, type PasoProveedorSii } from "./error-proveedor";
import { viajaIntactoEnLatin1 } from "./simpleapi-multipart";
import { diagnosticoPeticionSii } from "./simpleapi-diagnostico";
import { discriminarRechazoSinCuerpo } from "./simpleapi-rechazo";
import { extraerTed, xmlDesdeBytes } from "./xml-iso";

export type CredencialesSimpleApi = CredencialesSimpleApiV1;


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
  // El input viaja en ISO-8859-1 y saneado (como 1.0): una clave que el saneamiento cambiaría no abriría el .pfx en
  // SimpleAPI, así que se rechaza con un motivo claro en vez de enviarla alterada.
  const certificado = (c: CredencialesSimpleApi, paso: PasoProveedorSii) => {
    if (!viajaIntactoEnLatin1(c.certificadoClave)) {
      throw new ErrorProveedorSii(paso, "la clave del certificado tiene caracteres que SimpleAPI no admite (fuera de ISO-8859-1)");
    }
    return archivoPfx(c.certificadoPfxBase64);
  };
  return {
    nombre: "simpleapi",
    disponible,
    async firmar(payload: PayloadEmisionDte): Promise<DteXmlFirmado> {
      if (!disponible || !creds) throw new ErrorProveedorSii("generar", "la integración no está configurada");
      if (!payload.cafXml) throw new ErrorProveedorSii("generar", "falta el CAF del folio");
      // Sin ACTECO el DTE sale sin <Acteco> (obligatorio en el XSD del SII) y SimpleAPI responde 401 (CAR-240).
      if (!creds.actecoEmisor) throw new ErrorProveedorSii("generar", "falta el ACTECO del emisor, que el SII exige");
      const entrada = entradaGenerarDte(payload, creds);
      // Como 1.0: input, luego el certificado y el CAF, ambos con el nombre de campo `file`; el CAF en sus bytes.
      const pfx = certificado(creds, "generar");
      const caf = archivoXml(payload.cafXml, "caf.xml");
      try {
        const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.generar, creds.apiKey, [
          { nombre: "input", texto: JSON.stringify(entrada) },
          pfx,
          caf,
        ]);
        const xml = exigirXml(xmlDesdeBytes(await leerBytesRespuesta(res, "generar", secretosDe(creds))), "generar");
        const ted = extraerTed(xml);
        if (!ted) throw new ErrorProveedorSii("generar", "el DTE generado no trae timbre electrónico");
        return { xml, timbrePdf417: ted };
      } catch (e) {
        // Solo ante un rechazo: la forma de lo enviado (largos, 0x30, formato del CAF, nombres de claves), sin secretos.
        if (e instanceof ErrorProveedorSii) e.peticion = diagnosticoPeticionSii(entrada, pfx.bytes, caf.bytes);
        // Un 401/403 vacío puede ser la key o el contenido: la sonda de la key lo distingue (CAR-263b).
        throw await discriminarRechazoSinCuerpo(e, creds.apiKey);
      }
    },
    async enviar(xmlFirmado: string, ambiente: AmbienteSii): Promise<EnvioSiiResultado> {
      if (!disponible || !creds) throw new ErrorProveedorSii("enviar", "la integración no está configurada");
      const sobre = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.envioGenerar, creds.apiKey, [
        {
          nombre: "input",
          texto: jsonInputSobreEnvio(
            { rutEmisor: rutEmisorDeXml(xmlFirmado), resolucionNumero: creds.resolucionNumero, resolucionFecha: creds.resolucionFecha },
            creds,
          ),
        },
        certificado(creds, "sobre de envío"),
        archivoXml(xmlFirmado, "dte.xml"),
      ]);
      const xmlSobre = exigirXml(xmlDesdeBytes(await leerBytesRespuesta(sobre, "sobre de envío", secretosDe(creds))), "sobre de envío");
      const res = await postMultipartSimpleApi(SIMPLEAPI_RUTAS.envioEnviar, creds.apiKey, [
        { nombre: "input", texto: jsonInputEnviarSii(ambiente, creds) },
        certificado(creds, "enviar"),
        archivoXml(xmlSobre, "envio.xml"),
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
        { nombre: "input", texto: jsonInputConsultaEnvio(creds.rutEmpresa, trackId, ambiente, creds) },
        certificado(creds, "consultar"),
      ]);
      return mapearConsultaEnvio(await leerJsonRespuesta<RespuestaConsultaEnvio>(res, "consultar", secretosDe(creds)));
    },
  };
}
