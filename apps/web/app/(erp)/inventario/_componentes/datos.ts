import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros, SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { leerEntrada, type Pagina, todasLasPaginas } from "./paginas";
import type { TipoInventario } from "./tipos";

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Catálogo de tipos: búsqueda, categoría y estado se filtran aquí. */
export async function cargarTipos(p: Parametros) {
  const { r, items: todos } = await todasLasPaginas((desde) =>
    ejecutarComoUsuario<Pagina<TipoInventario>>("erp", "inventario.tipos.list", { incluirInactivos: true, ...desde }),
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

/** Datos de la página de tipos: la lista filtrada, la búsqueda y el permiso. */
export async function cargarPaginaTipos(searchParams: SearchParams) {
  const { p, puedeGestionar } = await leerEntrada(searchParams, "/inventario/tipos", "inventario:tipos.manage");
  return { ...(await cargarTipos(p)), q: p.q, puedeGestionar };
}

/** Datos de la página de la ficha: la lista de la izquierda, la ficha (sin esperar) y el permiso. */
export async function cargarFichaTipo(params: Promise<{ id: string }>, searchParams: SearchParams) {
  const [{ id }, { p, puedeGestionar }] = await Promise.all([params, leerEntrada(searchParams, "/inventario/tipos", "inventario:tipos.manage")]);
  const datos = cargarTipo(id);
  datos.catch(() => undefined);
  return { id, p, datos, lista: await cargarTipos(p), puedeGestionar };
}
