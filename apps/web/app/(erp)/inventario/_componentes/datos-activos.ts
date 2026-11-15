import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros, SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { leerEntrada, type Pagina, todasLasPaginas } from "./paginas";
import type { Activo, FichaActivo, TipoInventario } from "./tipos";

/** Activos filtrados en el servidor (tipo, estado y texto), página a página: la lista nunca se corta. */
export async function cargarActivos(p: Parametros) {
  const filtros = {
    ...(p["tipo"] ? { tipoId: p["tipo"] } : {}),
    ...(p["estado"] ? { estado: p["estado"] } : {}),
    ...(p["q"] ? { q: p["q"] } : {}),
    incluirBaja: p["estado"] === "de_baja",
  };
  const { r, items } = await todasLasPaginas((desde) =>
    ejecutarComoUsuario<Pagina<Activo>>("erp", "inventario.activos.list", { ...filtros, ...desde }),
  );
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
  const r = await ejecutarComoUsuario<FichaActivo>("erp", "inventario.activos.get", { id });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), activo: r.ok ? r.data : null };
}

/** Datos de la página de la ficha: la lista de la izquierda, la ficha (sin esperar) y el permiso. */
export async function cargarFichaActivo(params: Promise<{ id: string }>, searchParams: SearchParams) {
  const [{ id }, { p, puedeGestionar }] = await Promise.all([params, leerEntrada(searchParams, "/inventario", "inventario:gestionar")]);
  const datos = cargarActivo(id);
  datos.catch(() => undefined);
  return { id, p, datos, lista: await cargarActivos(p), puedeGestionar };
}
