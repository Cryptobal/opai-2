import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { cargarOpcionesEtiqueta, filtroEtiquetaDe } from "@/app/_components/etiquetas/opciones";
import { ejecutarComoUsuario } from "@/lib/servidor";
import { leerParametros, type Parametros } from "@/lib/parametros";
import type { CuentaDetalle, CuentaFila, Pagina } from "@/lib/tipos-maestros";

export type Filtros = Parametros;

/** Lista de cuentas filtrada (búsqueda y estado en la capacidad; "con instalaciones" aquí). */
export async function cargarCuentas(f: Filtros) {
  const [r, etiquetas] = await Promise.all([
    ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", {
    limite: 100,
    ...filtroEtiquetaDe(f),
    ...(f["q"] ? { q: f["q"] } : {}),
    ...(f["estado"] ? { estado: f["estado"] } : {}),
    }),
    cargarOpcionesEtiqueta(),
  ]);
  const items = r.ok ? r.data.items.filter((c) => f["con"] !== "si" || c.instalaciones > 0) : [];
  return { state: estadoPantalla(r), items, etiquetas, siguiente: r.ok ? r.data.siguiente : null };
}

export async function cargarCuenta(id: string) {
  const r = await ejecutarComoUsuario<CuentaDetalle>("erp", "core.cuentas.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), cuenta: r.ok ? r.data : null };
}

export const filtrosDe = leerParametros;
