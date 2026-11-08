import { type ItemFijado, unirAccesos } from "@opai/ds";

export const MAXIMO_ACCESOS = 5;
export const MAXIMO_FIJADOS = 5;

/** Fijados primero y recientes después, sin repetir destino ni nombre y hasta cinco (diseño §4.1.6, CAR-224). */
export function juntarAccesos(
  fijados: readonly ItemFijado[],
  recientes: readonly ItemFijado[],
): ItemFijado[] {
  return unirAccesos(fijados, recientes, MAXIMO_ACCESOS);
}
