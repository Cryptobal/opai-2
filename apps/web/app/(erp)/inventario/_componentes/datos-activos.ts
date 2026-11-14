import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Activo, FichaActivo, TipoInventario } from "./tipos";

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
  const r = await ejecutarComoUsuario<FichaActivo>("erp", "inventario.activos.get", { id });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), activo: r.ok ? r.data : null };
}
