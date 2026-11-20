import { POR_PAGINA, vistaPaginaCursor } from "@/app/_components/maestros/paginacion-cursor";
import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { InstalacionDetalle, InstalacionFila, Pagina } from "@/lib/tipos-maestros";

/** Instalaciones filtradas por texto, cuenta, estado y región, paginadas por cursor, con el catálogo de regiones. */
export async function cargarInstalaciones(p: Parametros) {
  // Sin `estado` en la URL se abren las activas; `todas` quita el filtro (CAR-567).
  const estado = p["estado"] ?? "activa";
  const [r, regiones, cuentaSel] = await Promise.all([
    ejecutarComoUsuario<Pagina<InstalacionFila>>("erp", "core.instalaciones.list", {
      limite: POR_PAGINA,
      ...(p["q"] ? { q: p["q"] } : {}),
      ...(p["cuenta"] ? { cuentaId: p["cuenta"] } : {}),
      ...(estado !== "todas" ? { estado } : {}),
      ...(p["region"] ? { region: p["region"] } : {}),
      ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
    }),
    ejecutarComoUsuario<{ items: { nombre: string }[] }>("erp", "core.regiones.list", {}),
    p["cuenta"]
      ? ejecutarComoUsuario<{ nombre: string }>("erp", "core.cuentas.get", { id: requerirUuid(p["cuenta"]) })
      : Promise.resolve(null),
  ]);
  const regionOpts = regiones.ok
    ? regiones.data.items.map((x) => ({ valor: x.nombre, etiqueta: x.nombre }))
    : [];
  return {
    ...vistaPaginaCursor(r),
    regiones: regionOpts,
    cuentaEtiqueta: cuentaSel?.ok ? cuentaSel.data.nombre : null,
  };
}

export async function cargarInstalacion(id: string) {
  const r = await ejecutarComoUsuario<InstalacionDetalle>("erp", "core.instalaciones.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), instalacion: r.ok ? r.data : null };
}