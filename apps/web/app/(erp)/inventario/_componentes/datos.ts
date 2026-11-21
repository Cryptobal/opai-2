import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { type Parametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { conCursor, contextoPagina, sinTildes, todas } from "./paginas";
import type { PrendaKit, TipoInventario } from "./tipos";

/** Catálogo de tipos: búsqueda, categoría y estado se filtran aquí. */
export async function cargarTipos(p: Parametros) {
  const { r, items: todos } = await todas<TipoInventario>(
    (cursor) =>
      ejecutarComoUsuario("erp", "inventario.tipos.list", {
        incluirInactivos: true,
        limite: 200,
        ...conCursor(cursor),
      }),
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

/** Prendas del uniforme de la empresa (caben en una página: el kit tiene hasta 30). */
export async function cargarCategoriasTipos() {
  const r = await ejecutarComoUsuario<{
    items: { clave: string; nombre: string; comportamiento: "activo" | "ropa"; activo: boolean }[];
  }>("erp", "inventario.config.categorias_list", { incluirInactivas: false });
  const defecto = [
    { valor: "activo", etiqueta: "Activo", comportamiento: "activo" as const },
    { valor: "ropa", etiqueta: "Ropa", comportamiento: "ropa" as const },
  ];
  return r.ok
    ? r.data.items
        .filter((c) => c.activo)
        .map((c) => ({ valor: c.clave, etiqueta: c.nombre, comportamiento: c.comportamiento }))
    : defecto;
}

export async function cargarKit(): Promise<PrendaKit[]> {
  const r = await ejecutarComoUsuario<{ items: PrendaKit[] }>("erp", "inventario.prendas.list", {
    limite: 50,
  });
  return r.ok ? r.data.items : [];
}

export async function cargarTipo(id: string) {
  requerirUuid(id);
  const r = await ejecutarComoUsuario<TipoInventario>("erp", "inventario.tipos.get", { id });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), tipo: r.ok ? r.data : null };
}

/** Datos de la página de la ficha: la lista de la izquierda, la ficha (sin esperar) y el permiso. */
export async function cargarFichaTipo(params: Promise<{ id: string }>, searchParams: SearchParams) {
  const [{ id }, { p, puede }] = await Promise.all([
    params,
    contextoPagina(searchParams, "/inventario/tipos", "inventario:tipos.manage"),
  ]);
  const datos = cargarTipo(id);
  datos.catch(() => undefined);
  const [lista, kit, categorias] = await Promise.all([
    cargarTipos(p),
    cargarKit(),
    cargarCategoriasTipos(),
  ]);
  return { id, p, datos, lista, kit, categorias, puedeGestionar: puede };
}