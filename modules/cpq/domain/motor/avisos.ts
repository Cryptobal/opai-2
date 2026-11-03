/**
 * Avisos tipados del cálculo (CAR-162): la UI, `/api/v1` y el MCP detectan la causa por `codigo`,
 * nunca comparando textos. Ningún aviso lleva montos: se exponen también sin `cpq:costos.ver`.
 */
export type CodigoAvisoCpq = "mutual_sin_confirmar" | "sueldo_faltante" | "juego_legal_faltante";

export type AvisoCalculoCpq = {
  codigo: CodigoAvisoCpq;
  mensaje: string;
  /** Línea de puesto afectada (`sueldo_faltante`). */
  lineaId?: string;
  /** Indicador legal que falta para la fecha (`juego_legal_faltante`). */
  indicador?: string;
};

/** Advertencia legible de la mutual supuesta en 0 % (decisión de Carlos del 3-nov-2026). */
export const AVISO_MUTUAL_SUPUESTA = "Mutual adicional sin confirmar: se calcula con 0 %.";

/** Mensaje del bloqueo de envío mientras la mutual siga supuesta. */
export const BLOQUEO_ENVIO_MUTUAL =
  "Confirma la mutual adicional antes de enviar al cliente: hoy se calcula con 0 %.";
