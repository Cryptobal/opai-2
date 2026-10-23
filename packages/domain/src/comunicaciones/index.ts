import { COMUNICABLES_DOCUMENTOS } from "./documentos";
import { COMUNICABLES_SISTEMA } from "./sistema";
import type { EventoComunicable } from "./tipos";
import { COMUNICABLES_USUARIOS } from "./usuarios";

export * from "./correo";
export type {
  Canal,
  EventoComunicable,
  PlantillaBase,
  TipoVariable,
  VariableComunicable,
} from "./tipos";

export const COMUNICABLES_NUCLEO: readonly EventoComunicable[] = [
  ...COMUNICABLES_USUARIOS,
  ...COMUNICABLES_DOCUMENTOS,
  ...COMUNICABLES_SISTEMA,
];

/** Datos de ejemplo anidados a partir de las rutas declaradas ("documento.tipo" → { documento: { tipo } }). */
export function ejemplosDe(e: EventoComunicable): Record<string, unknown> {
  const datos: Record<string, unknown> = {};
  for (const variable of e.variables) {
    const partes = variable.ruta.split(".");
    let nodo = datos;
    for (const p of partes.slice(0, -1)) nodo = (nodo[p] ??= {}) as Record<string, unknown>;
    nodo[partes.at(-1) as string] = variable.ejemplo;
  }
  return datos;
}

export const rutasDe = (e: EventoComunicable) => e.variables.map((v) => v.ruta);
