import type { OpcionCombobox } from "@opai/ds";

import type { Candidatos } from "@/app/_acciones/candidatos-documento";

export const ERROR = "__error";
export const MAS = "__mas";
/** Filas informativas del buscador: se muestran pero nunca se pueden elegir. */
export const FILA_INFO: ReadonlySet<string> = new Set([ERROR, MAS]);

export const TEXTO_MAS = "Hay más resultados: refina la búsqueda";

/**
 * Opciones del Combobox a partir de la respuesta de la búsqueda. El Combobox no tiene estado de
 * error ni de «hay más»: ambos se muestran como una fila no elegible.
 */
export function opcionesDeCandidatos(r: Candidatos): OpcionCombobox[] {
  if (!r.ok) return [{ valor: ERROR, etiqueta: r.mensaje }];
  const filas = r.items.map((c) => ({
    valor: c.id,
    etiqueta: c.etiqueta,
    ...(c.detalle ? { detalle: c.detalle } : {}),
  }));
  return r.hayMas ? [...filas, { valor: MAS, etiqueta: TEXTO_MAS }] : filas;
}
