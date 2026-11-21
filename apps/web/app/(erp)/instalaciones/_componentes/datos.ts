import { tamanoPagina } from "@/app/_components/maestros/paginacion-cursor";
import { estadoPantalla } from "@/lib/formato";
import { esUuid, requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { CuentaFila, InstalacionDetalle, InstalacionFila, Pagina } from "@/lib/tipos-maestros";

/** Instalaciones filtradas por texto, cuenta, estado y región, con las cuentas para el filtro. */
export async function cargarInstalaciones(p: Parametros) {
  // Sin `estado` en la URL se abren las activas; `todas` quita el filtro (CAR-567).
  const estado = p["estado"] ?? "activa";
  const limite = tamanoPagina(p);
  const [r, cuentas] = await Promise.all([
    ejecutarComoUsuario<Pagina<InstalacionFila>>("erp", "core.instalaciones.list", {
      limite,
      ...(p.cursor && esUuid(p.cursor) ? { cursor: p.cursor } : {}),
      ...(p["q"] ? { q: p["q"] } : {}),
      ...(p["cuenta"] ? { cuentaId: p["cuenta"] } : {}),
      ...(estado !== "todas" ? { estado } : {}),
      ...(p["region"] ? { region: p["region"] } : {}),
    }),
    ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", { limite: 100 }),
  ]);
  return {
    state: estadoPantalla(r),
    items: r.ok ? r.data.items : [],
    siguiente: r.ok ? r.data.siguiente : null,
    cuentas: cuentas.ok ? cuentas.data.items.map((c) => ({ valor: c.id, etiqueta: c.nombre })) : [],
  };
}

export async function cargarInstalacion(id: string) {
  const r = await ejecutarComoUsuario<InstalacionDetalle>("erp", "core.instalaciones.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), instalacion: r.ok ? r.data : null };
}

export const REGIONES = [
  "Región Metropolitana",
  "Valparaíso",
  "Biobío",
  "Coquimbo",
  "Antofagasta",
  "O'Higgins",
  "Maule",
  "Araucanía",
  "Los Lagos",
  "Arica y Parinacota",
  "Tarapacá",
  "Atacama",
  "Los Ríos",
  "Aysén",
  "Magallanes y Antártica Chilena",
  "Ñuble",
].map((r) => ({ valor: r, etiqueta: r }));