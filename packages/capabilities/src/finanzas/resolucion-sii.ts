// Resolución SII del emisor: el número 0 es válido solo en certificación (CAR-196).

import type { AmbienteSii } from "@opai/integrations";

/**
 * El SII asigna la resolución número 0 a quien se certifica. En producción debe ser un número mayor que 0.
 * `ambiente` es el configurado por la empresa (no el efectivo): ante «producción» se exige siempre >0, falla cerrado.
 */
export function resolucionSiiValida(
  ambiente: AmbienteSii | string | null | undefined,
  numero: number | null | undefined,
): boolean {
  if (numero == null || !Number.isInteger(numero) || numero < 0) return false;
  return ambiente === "produccion" ? numero > 0 : true;
}
