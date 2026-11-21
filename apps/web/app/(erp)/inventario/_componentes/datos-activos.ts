import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros, SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { conCursor, contextoPagina, todas } from "./paginas";
import type { Activo, Entrega, FichaActivo, TipoInventario } from "./tipos";

/** Activos filtrados en el servidor (tipo, estado y texto), página a página: la lista nunca se corta. */
export async function cargarActivos(p: Parametros) {
  const filtros = {
    ...(p["tipo"] ? { tipoId: p["tipo"] } : {}),
    ...(p["estado"] ? { estado: p["estado"] } : {}),
    ...(p["q"] ? { q: p["q"] } : {}),
    incluirBaja: p["estado"] === "de_baja",
    limite: 200,
  };
  const { r, items } = await todas<Activo>((cursor) => ejecutarComoUsuario("erp", "inventario.activos.list", { ...filtros, ...conCursor(cursor) }), 25);
  const tipos = await ejecutarComoUsuario<{ items: TipoInventario[] }>("erp", "inventario.tipos.list", {
    categoria: "activo",
    limite: 200,
  });
  return {
    state: estadoPantalla(r),
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
  const [{ id }, { p, puede }] = await Promise.all([params, contextoPagina(searchParams, "/inventario", "inventario:gestionar")]);
  const datos = cargarActivo(id);
  datos.catch(() => undefined);
  return { id, p, datos, lista: await cargarActivos(p), puedeGestionar: puede };
}
