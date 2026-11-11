// Traduce los fallos tipados del proveedor SII (SimpleAPI) a una regla de negocio legible (CAR-242): la persona ve
// el motivo en vez del INTERNAL genérico. Cualquier otro error se relanza tal cual.
import { ErrorProveedorSii, type PasoProveedorSii } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";

const ACCION: Record<PasoProveedorSii, string> = {
  generar: "generar ni firmar el DTE",
  "sobre de envío": "armar el sobre de envío",
  enviar: "enviar el DTE al SII",
  consultar: "consultar el estado en el SII",
};

/** Tope de largo de un mensaje de negocio que la UI muestra tal cual (`esMensajeDeNegocio` en apps/web). */
export const MAX_MENSAJE_NEGOCIO = 300;

/** El detalle se recorta para que el mensaje completo quepa: la consecuencia (p. ej. «envío incierto») nunca se pierde. */
function detalleQueCabe(detalle: string | null | undefined, largoSinDetalle: number): string {
  if (!detalle) return "";
  const disponible = MAX_MENSAJE_NEGOCIO - largoSinDetalle - 3; // « (» y «)»
  if (disponible < 12) return "";
  const corto = detalle.length <= disponible ? detalle : `${detalle.slice(0, disponible - 1).trimEnd()}…`;
  return ` (${corto})`;
}

/**
 * `consecuencia` explica qué quedó como estaba (p. ej. que el folio no se usó); puede depender del error (un envío
 * incierto no invita a reenviar). El detalle del proveedor es texto externo: va en el mensaje para la persona y,
 * marcado como externo, en `detalles`; nunca habilita nada por sí mismo ni va al log.
 */
export function comoReglaSiProveedorSii(
  error: unknown,
  consecuencia: string | ((e: ErrorProveedorSii) => string),
): unknown {
  if (!(error instanceof ErrorProveedorSii)) return error;
  // Log categórico: una caída del proveedor sigue visible aunque la persona reciba una regla de negocio.
  console.warn("[sii] rechazo_proveedor", {
    evento: "sii.proveedor.rechazo",
    paso: error.paso,
    status: error.status ?? null,
    motivo: error.motivoSeguro,
    // Límites de uso que informó SimpleAPI (x-rate-limit-*, retry-after), saneados: ayudan a distinguir 401/429 (CAR-240).
    limites: error.limites,
    // Forma del cuerpo sin su texto: «vacio» (contenido rechazado), «suscripcion» (la key no cubre el servicio) u «otro».
    cuerpo: error.cuerpo,
    // Forma de la respuesta y de la petición rechazadas (CAR-240): content-type/length, largos, si el PFX es DER, formato
    // del CAF, si Certificado.Rut tiene forma válida y los nombres de IdentificacionDTE. Nunca texto, base64 ni XML.
    respuesta: error.respuesta,
    peticion: error.peticion,
  });
  const despues = typeof consecuencia === "function" ? consecuencia(error) : consecuencia;
  const base = (detalle: string) => `SimpleAPI no pudo ${ACCION[error.paso]}: ${error.motivo}${detalle}. ${despues}`;
  return reglaDeNegocio(base(detalleQueCabe(error.detalle, base("").length)), {
    proveedor: "simpleapi",
    paso: error.paso,
    ...(error.status != null ? { status: error.status } : {}),
    ...(error.detalle ? { detalleProveedor: { texto: error.detalle, origen: "externo" } } : {}),
  });
}
