import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { CuentaFila, InstalacionDetalle, InstalacionFila, Pagina } from "@/lib/tipos-maestros";

/** Instalaciones filtradas por texto, cuenta, estado y región, con las cuentas para el filtro. */
export async function cargarInstalaciones(p: Parametros) {
  const [r, cuentas] = await Promise.all([
    ejecutarComoUsuario<Pagina<InstalacionFila>>("erp", "core.instalaciones.list", {
      limite: 100,
      ...(p["q"] ? { q: p["q"] } : {}),
      ...(p["cuenta"] ? { cuentaId: p["cuenta"] } : {}),
      ...(p["estado"] ? { estado: p["estado"] } : {}),
      ...(p["region"] ? { region: p["region"] } : {}),
    }),
    ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", { limite: 100 }),
  ]);
  return {
    state: estadoPantalla(r),
    items: r.ok ? r.data.items : [],
    cuentas: cuentas.ok ? cuentas.data.items.map((c) => ({ valor: c.id, etiqueta: c.nombre })) : [],
  };
}

export async function cargarInstalacion(id: string) {
  const r = await ejecutarComoUsuario<InstalacionDetalle>("erp", "core.instalaciones.get", { id });
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
].map((r) => ({ valor: r, etiqueta: r }));
