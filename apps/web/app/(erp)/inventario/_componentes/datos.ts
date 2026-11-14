import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { TipoInventario } from "./tipos";

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Pagina = { items: TipoInventario[]; siguiente: string | null };

/** Todos los tipos, página a página (son pocos; nunca se corta la lista). */
async function todosLosTipos() {
  const items: TipoInventario[] = [];
  let cursor: string | null = null;
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const r: Awaited<ReturnType<typeof ejecutarComoUsuario<Pagina>>> = await ejecutarComoUsuario<Pagina>("erp", "inventario.tipos.list", {
      incluirInactivos: true,
      limite: 200,
      ...(cursor ? { cursor } : {}),
    });
    if (!r.ok) return { r, items };
    items.push(...r.data.items);
    cursor = r.data.siguiente;
    if (!cursor) return { r, items };
  }
  return { r: { ok: true as const }, items };
}

/** Catálogo de tipos: búsqueda, categoría y estado se filtran aquí. */
export async function cargarTipos(p: Parametros) {
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
