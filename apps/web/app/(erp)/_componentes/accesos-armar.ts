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

/**
 * «Editar» se ofrece recién en el navegador. Mientras la página hidrata tiene que coincidir con el HTML
 * del servidor, que no conoce los fijados: si el shell los entrega antes de que hidrate el contenido,
 * ofrecerlo ahí rompe la hidratación de todo Inicio.
 */
export const ofreceEditar = (
  enNavegador: boolean,
  hayEditables: boolean,
  editando: boolean,
): boolean => enNavegador && (hayEditables || editando);
