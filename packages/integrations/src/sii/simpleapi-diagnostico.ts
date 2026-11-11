// Diagnóstico seguro de un rechazo de SimpleAPI (CAR-240). Solo formas, largos y nombres: nunca el cuerpo crudo, el
// base64 o los bytes del .pfx, el XML del CAF, la clave del certificado ni la API key. Va al log únicamente cuando
// SimpleAPI rechaza, para ver la forma de lo enviado (PFX, CAF y claves del JSON). Un 401 sin cuerpo no distingue la
// key del contenido; el del 10-nov-2026 era la key guardada sin guiones (CAR-263, adenda de ADR-088).
import { diagnosticarCafGuardado, type FormatoCafGuardado } from "./caf-bytes";
import { RUT_TITULAR_SII } from "./simpleapi-formatos";

/** Lo que se puede registrar de la respuesta rechazada. */
export type DiagnosticoRespuestaSii = {
  /** `content-type` saneado (minúsculas, solo caracteres de tipo MIME); null si no vino o no es seguro. */
  contentType: string | null;
  /** `content-length` si es un número; null si no vino (p. ej. respuesta por trozos). */
  contentLength: string | null;
  /** Largo (caracteres) del cuerpo leído; distingue un vacío real de uno sin `content-length`. */
  cuerpoLargo: number;
  /** Largo del detalle saneado para la persona (`detalleSeguroDeRespuesta`); el texto nunca va al log. */
  detalleLargo: number | null;
  /** Solo los nombres de las claves de primer nivel de un cuerpo JSON (nunca valores): indican qué forma de error es. */
  clavesJson: string[] | null;
};

/** Lo que se puede registrar de la petición de `dte/generar` que SimpleAPI rechazó. */
export type DiagnosticoPeticionSii = {
  /** Bytes del .pfx ya decodificado del base64 guardado. */
  pfxBytes: number;
  /** Empieza por 0x30 (SEQUENCE DER): un PKCS#12 real, no texto ni base64 doble. */
  pfxDer: boolean;
  /** Bytes del CAF tal como viajan. */
  cafBytes: number;
  /** Forma de esos bytes según `diagnosticarCafGuardado`. */
  cafFormato: FormatoCafGuardado;
  /** `Certificado.Rut` tiene la forma `12345678-9` que espera SimpleAPI. */
  certificadoRutValido: boolean;
  /** Nombres (nunca valores) de las claves de `IdentificacionDTE`. */
  clavesIdentificacionDte: string[];
};

const CONTENT_TYPE = /^[a-z0-9!#$&^_.+\-/;=, ]{1,100}$/;
const NUMERO = /^\d{1,12}$/;

export function diagnosticoRespuestaSii(headers: Headers, cuerpo: string, detalle: string | null): DiagnosticoRespuestaSii {
  const tipo = headers.get("content-type")?.trim().toLowerCase() ?? "";
  const largo = headers.get("content-length")?.trim() ?? "";
  return {
    contentType: CONTENT_TYPE.test(tipo) ? tipo : null,
    contentLength: NUMERO.test(largo) ? largo : null,
    cuerpoLargo: cuerpo.length,
    detalleLargo: detalle ? detalle.length : null,
    clavesJson: clavesDeJson(cuerpo),
  };
}

const CLAVE = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/;

/** Nombres de las claves de un objeto JSON (máx. 10), sin valores. Las que no parecen identificadores se omiten (CAR-270). */
function clavesDeJson(cuerpo: string): string[] | null {
  try {
    const j = JSON.parse(cuerpo.slice(0, 8 * 1024)) as unknown;
    if (!j || typeof j !== "object" || Array.isArray(j)) return null;
    return Object.keys(j).filter((k) => CLAVE.test(k)).slice(0, 10);
  } catch {
    return null;
  }
}

export function diagnosticoPeticionSii(
  entrada: { Documento: { Encabezado: { IdentificacionDTE: object } }; Certificado: { Rut: string } },
  pfx: Uint8Array,
  caf: Uint8Array,
): DiagnosticoPeticionSii {
  return {
    pfxBytes: pfx.length,
    pfxDer: pfx[0] === 0x30,
    cafBytes: caf.length,
    cafFormato: diagnosticarCafGuardado(caf).formato,
    certificadoRutValido: RUT_TITULAR_SII.test(entrada.Certificado.Rut),
    clavesIdentificacionDte: Object.keys(entrada.Documento.Encabezado.IdentificacionDTE),
  };
}
