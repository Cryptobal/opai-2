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
  });
  const detalle = error.detalle ? ` (${error.detalle})` : "";
  const despues = typeof consecuencia === "function" ? consecuencia(error) : consecuencia;
  return reglaDeNegocio(`SimpleAPI no pudo ${ACCION[error.paso]}: ${error.motivo}${detalle}. ${despues}`, {
    proveedor: "simpleapi",
    paso: error.paso,
    ...(error.status != null ? { status: error.status } : {}),
    ...(error.detalle ? { detalleProveedor: { texto: error.detalle, origen: "externo" } } : {}),
  });
}
