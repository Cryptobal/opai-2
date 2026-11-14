// Piezas de servidor compartidas por las páginas de Inventario: listas por cursor, búsqueda sin tildes y
// el contexto de cada página (parámetros y permiso).
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

type Pagina<T> = { items: T[]; siguiente: string | null };
type Respuesta<T> = { ok: true; data: Pagina<T> } | { ok: false; error: { code: string } };

export const conCursor = (cursor: string | null) => (cursor ? { cursor } : {});
export const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Recorre una lista por cursor hasta `maxPaginas` (la lista nunca se corta); `pedir` usa el id literal de la capacidad. */
export async function todas<T>(pedir: (cursor: string | null) => Promise<Respuesta<T>>, maxPaginas: number) {
  const items: T[] = [];
  let cursor: string | null = null;
  let error: Respuesta<T> | null = null;
  for (let i = 0; i < maxPaginas; i++) {
    const r = await pedir(cursor);
    if (!r.ok) {
      if (i === 0) error = r;
      break;
    }
    items.push(...r.data.items);
    cursor = r.data.siguiente;
    if (!cursor) break;
  }
  return { r: error ?? ({ ok: true } as const), items };
}

/** Parámetros de la página, sesión exigida y si el usuario tiene el permiso indicado. */
export async function contextoPagina(searchParams: SearchParams, ruta: string, permiso: string) {
  const [p, identidad] = await Promise.all([leerParametros(searchParams), requerirIdentidad(ruta)]);
  return { p, puede: puedeDeIdentidad(identidad)(permiso) };
}
