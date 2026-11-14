import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { MovimientoRopa, Prenda, TipoInventario } from "./tipos";

type Pagina = { items: Prenda[]; siguiente: string | null };
type Resultado = Awaited<ReturnType<typeof ejecutarComoUsuario<Pagina>>>;

const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Tipos de ropa con sus existencias, página a página (la lista nunca se corta). */
export async function cargarRopa(p: Parametros) {
  const items: Prenda[] = [];
  let cursor: string | null = null;
  let r: Resultado | null = null;
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    r = await ejecutarComoUsuario<Pagina>("erp", "inventario.ropa.list", { limite: 200, ...(cursor ? { cursor } : {}) });
    if (!r.ok) break;
    items.push(...r.data.items);
    cursor = r.data.siguiente;
    if (!cursor) break;
  }
  const q = sinTildes(p["q"] ?? "");
  return { state: estadoPantalla(r ?? { ok: true }), items: items.filter((x) => !q || sinTildes(x.nombre).includes(q)) };
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
  const [{ id }, p, identidad] = await Promise.all([params, leerParametros(searchParams), requerirIdentidad("/inventario/ropa")]);
  const lista = await cargarRopa(p);
  const datos = cargarPrenda(id, lista.items);
  datos.catch(() => undefined);
  return { id, p, datos, lista, puedeGestionar: puedeDeIdentidad(identidad)("inventario:gestionar") };
}
