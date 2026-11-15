import type { Resultado } from "@opai/capabilities";

import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

export type Pagina<T> = { items: T[]; siguiente: string | null };

/** Parámetros de la URL y si quien entra a esa ruta de Inventario tiene el permiso de gestión. */
export async function leerEntrada(searchParams: SearchParams, ruta: string, permiso: string) {
  const [p, identidad] = await Promise.all([leerParametros(searchParams), requerirIdentidad(ruta)]);
  return { p, puedeGestionar: puedeDeIdentidad(identidad)(permiso) };
}

/** Todas las páginas de una lista de Inventario (son pocas: la lista nunca se corta); `r` es la última respuesta. */
export async function todasLasPaginas<T>(
  pedir: (desde: { limite: number; cursor?: string }) => Promise<Resultado<Pagina<T>>>,
) {
  const items: T[] = [];
  let cursor: string | null = null;
  for (let vuelta = 0; vuelta < 25; vuelta++) {
    const r = await pedir({ limite: 200, ...(cursor ? { cursor } : {}) });
    if (!r.ok) return { r, items };
    items.push(...r.data.items);
    cursor = r.data.siguiente;
    if (!cursor) return { r, items };
  }
  return { r: { ok: true as const }, items };
}
