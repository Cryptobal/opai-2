import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { TipoInventario } from "./tipos";
import { todasLasPaginas } from "./paginas";
import { sinTildes } from "./texto";

/** Todos los tipos, página a página (son pocos; nunca se corta la lista). */
async function todosLosTipos() {
  return todasLasPaginas<TipoInventario>((opts) =>
    ejecutarComoUsuario("erp", "inventario.tipos.list", { incluirInactivos: true, ...opts }),
  );
}

/** Catálogo de tipos: búsqueda, categoría y estado se filtran aquí. */
async function cargarTipos(p: Parametros) {
  const { r, items: todos } = await todosLosTipos();
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
  const [p, identidad] = await Promise.all([leerParametros(searchParams), requerirIdentidad("/inventario/tipos")]);
  return { ...(await cargarTipos(p)), q: p.q, puedeGestionar: puedeDeIdentidad(identidad)("inventario:tipos.manage") };
}

/** Datos de la página de la ficha: la lista de la izquierda, la ficha (sin esperar) y el permiso. */
export async function cargarFichaTipo(params: Promise<{ id: string }>, searchParams: SearchParams) {
  const [{ id }, p, identidad] = await Promise.all([params, leerParametros(searchParams), requerirIdentidad("/inventario/tipos")]);
  const datos = cargarTipo(id);
  datos.catch(() => undefined);
  return { id, p, datos, lista: await cargarTipos(p), puedeGestionar: puedeDeIdentidad(identidad)("inventario:tipos.manage") };
}
