// Traduce los fallos tipados del proveedor SII (SimpleAPI) a una regla de negocio legible (CAR-242): la persona ve
// el motivo saneado en vez del INTERNAL genérico. Cualquier otro error se relanza tal cual.
import { ErrorProveedorSii, type PasoProveedorSii } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";

const ACCION: Record<PasoProveedorSii, string> = {
  generar: "generar ni firmar el DTE",
  "sobre de envío": "armar el sobre de envío",
  enviar: "enviar el DTE al SII",
  consultar: "consultar el estado en el SII",
};

/** Con `consecuencia` se explica qué quedó como estaba (p. ej. que el folio no se usó). */
export function comoReglaSiProveedorSii(error: unknown, consecuencia: string): unknown {
  if (!(error instanceof ErrorProveedorSii)) return error;
  return reglaDeNegocio(`SimpleAPI no pudo ${ACCION[error.paso]}: ${error.motivo}. ${consecuencia}`, {
    proveedor: "simpleapi",
    paso: error.paso,
    ...(error.status != null ? { status: error.status } : {}),
  });
}
