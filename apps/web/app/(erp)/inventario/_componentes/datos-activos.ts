import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { Activo, Entrega, FichaActivo, TipoInventario } from "./tipos";

type Pagina = { items: Activo[]; siguiente: string | null };
type Resultado = Awaited<ReturnType<typeof ejecutarComoUsuario<Pagina>>>;

/** Activos filtrados en el servidor (tipo, estado y texto), página a página: la lista nunca se corta. */
export async function cargarActivos(p: Parametros) {
  const filtros = {
    ...(p["tipo"] ? { tipoId: p["tipo"] } : {}),
    ...(p["estado"] ? { estado: p["estado"] } : {}),
    ...(p["q"] ? { q: p["q"] } : {}),
    incluirBaja: p["estado"] === "de_baja",
    limite: 200,
  };
  const items: Activo[] = [];
  let cursor: string | null = null;
  let r: Resultado | null = null;
  for (let vuelta = 0; vuelta < 25; vuelta++) {
    r = await ejecutarComoUsuario<Pagina>("erp", "inventario.activos.list", { ...filtros, ...(cursor ? { cursor } : {}) });
    if (!r.ok) break;
    items.push(...r.data.items);
    cursor = r.data.siguiente;
    if (!cursor) break;
  }
  const tipos = await ejecutarComoUsuario<{ items: TipoInventario[] }>("erp", "inventario.tipos.list", {
    categoria: "activo",
    limite: 200,
  });
  return {
    state: estadoPantalla(r ?? { ok: true }),
    items,
    tipos: tipos.ok ? tipos.data.items : [],
  };
}

export async function cargarActivo(id: string) {
  requerirUuid(id);
  const [r, e] = await Promise.all([
    ejecutarComoUsuario<FichaActivo>("erp", "inventario.activos.get", { id }),
    ejecutarComoUsuario<{ items: Entrega[] }>("erp", "inventario.entregas.list", { activoId: id, limite: 1 }),
  ]);
  requerirEncontrado(r);
  return { state: estadoPantalla(r), activo: r.ok ? r.data : null, entrega: e.ok ? (e.data.items[0] ?? null) : null };
}

/** Datos de la página de la ficha: la lista de la izquierda, la ficha (sin esperar) y el permiso. */
export async function cargarFichaActivo(params: Promise<{ id: string }>, searchParams: SearchParams) {
  const [{ id }, p, identidad] = await Promise.all([params, leerParametros(searchParams), requerirIdentidad("/inventario")]);
  const datos = cargarActivo(id);
  datos.catch(() => undefined);
  return { id, p, datos, lista: await cargarActivos(p), puedeGestionar: puedeDeIdentidad(identidad)("inventario:gestionar") };
}
