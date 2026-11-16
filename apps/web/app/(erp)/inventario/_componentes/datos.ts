import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { type Parametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { conCursor, contextoPagina, sinTildes, todas } from "./paginas";
import type { TipoInventario } from "./tipos";

/** Catálogo de tipos: búsqueda, categoría y estado se filtran aquí. */
export async function cargarTipos(p: Parametros) {
  const { r, items: todos } = await todas<TipoInventario>(
    (cursor) => ejecutarComoUsuario("erp", "inventario.tipos.list", { incluirInactivos: true, limite: 200, ...conCursor(cursor) }),
    20,
  );
  const q = sinTildes(p["q"] ?? "");
  const items = todos.filter(
    (t) =>
      (!q || sinTildes(t.nombre).includes(q)) &&
      (!p["categoria"] || t.categoria === p["categoria"]) &&
      (!p["estado"] || (p["estado"] === "activo") === t.activo),
  );
  return { state: estadoPantalla(r), items, total: todos.length };
}

export async function cargarTipo(id: string) {
  requerirUuid(id);
  const r = await ejecutarComoUsuario<TipoInventario>("erp", "inventario.tipos.get", { id });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), tipo: r.ok ? r.data : null };
}

/** Datos de la página de la ficha: la lista de la izquierda, la ficha (sin esperar) y el permiso. */
export async function cargarFichaTipo(params: Promise<{ id: string }>, searchParams: SearchParams) {
  const [{ id }, { p, puede }] = await Promise.all([params, contextoPagina(searchParams, "/inventario/tipos", "inventario:tipos.manage")]);
  const datos = cargarTipo(id);
  datos.catch(() => undefined);
  return { id, p, datos, lista: await cargarTipos(p), puedeGestionar: puede };
}