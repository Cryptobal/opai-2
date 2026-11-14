import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros, SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { conCursor, contextoPagina, sinTildes, todas } from "./paginas";
import type { MovimientoRopa, Prenda, TipoInventario } from "./tipos";

/** Tipos de ropa con sus existencias, página a página (la lista nunca se corta). */
export async function cargarRopa(p: Parametros) {
  const { r, items } = await todas<Prenda>((cursor) => ejecutarComoUsuario("erp", "inventario.ropa.list", { limite: 200, ...conCursor(cursor) }), 20);
  const q = sinTildes(p["q"] ?? "");
  return { state: estadoPantalla(r), items: items.filter((x) => !q || sinTildes(x.nombre).includes(q)) };
}

/** Ficha de un tipo de ropa: sus tallas, existencias y últimos movimientos. */
export async function cargarPrenda(id: string, lista: Prenda[]) {
  requerirUuid(id);
  const [t, m] = await Promise.all([
    ejecutarComoUsuario<TipoInventario>("erp", "inventario.tipos.get", { id }),
    ejecutarComoUsuario<{ items: MovimientoRopa[] }>("erp", "inventario.ropa.movimientos", { tipoId: id, limite: 50 }),
  ]);
  requerirEncontrado(t);
  const tipo = t.ok && t.data.categoria === "ropa" ? t.data : null;
  const prenda = lista.find((x) => x.tipoId === id) ?? null;
  return { state: estadoPantalla(t), tipo, prenda, movimientos: m.ok ? m.data.items : [] };
}

/** Datos de la página de la ficha: la lista de la izquierda, la ficha y el permiso. */
export async function cargarFichaRopa(params: Promise<{ id: string }>, searchParams: SearchParams) {
  const [{ id }, { p, puede }] = await Promise.all([params, contextoPagina(searchParams, "/inventario/ropa", "inventario:gestionar")]);
  const lista = await cargarRopa(p);
  const datos = cargarPrenda(id, lista.items);
  datos.catch(() => undefined);
  return { id, p, datos, lista, puedeGestionar: puede };
}
