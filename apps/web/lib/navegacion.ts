import { listarModulos } from "@opai/capabilities";
import { tienePermiso, type Rol } from "@opai/domain";

/** Ítem de navegación serializable (el icono se nombra; el cliente lo resuelve). */
export type ItemNav = { href: string; etiqueta: string; icono: string; grupo?: string };

const esDesarrollo = process.env.NODE_ENV !== "production";

/**
 * Navegación del ERP: Inicio + entradas de los manifests (módulo activo y algún permiso del
 * módulo para el rol) + Configuración según permisos del núcleo.
 */
export function navegacionErp(rol: Rol | null, modulosActivos: readonly string[]): ItemNav[] {
  const items: ItemNav[] = [{ href: "/", etiqueta: "Inicio", icono: "Home" }];
  if (!rol) return items;
  for (const m of listarModulos()) {
    if (!modulosActivos.includes(m.id)) continue;
    if (!m.permisos.some((p) => tienePermiso(rol, p.id))) continue;
    const entradas = m.navegacion.filter((n) => n.portal === "erp");
    for (const n of [...entradas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))) {
      items.push({ href: n.href, etiqueta: n.etiqueta, icono: n.icono, grupo: m.nombre });
    }
  }
  const grupo = "Configuración";
  if (tienePermiso(rol, "core:users.read")) {
    items.push({ href: "/configuracion/usuarios", etiqueta: "Usuarios", icono: "Users", grupo });
  }
  if (tienePermiso(rol, "core:apikeys.manage")) {
    items.push({ href: "/configuracion/api-keys", etiqueta: "API keys", icono: "KeyRound", grupo });
  }
  if (tienePermiso(rol, "core:tenant.read")) {
    items.push({ href: "/configuracion/empresa", etiqueta: "Empresa", icono: "Building2", grupo });
  }
  if (esDesarrollo)
    items.push({ href: "/ds", etiqueta: "Diseño", icono: "Palette", grupo: "Desarrollo" });
  return items;
}

export const NAV_PLATAFORMA: ItemNav[] = [
  { href: "/platform", etiqueta: "Empresas", icono: "Building2" },
  { href: "/platform/tenants/nuevo", etiqueta: "Nueva empresa", icono: "Plus" },
];

/** Portales sin módulos todavía (fase 3): solo su inicio. */
export function navegacionPortal(href: string): ItemNav[] {
  return [{ href, etiqueta: "Inicio", icono: "Home" }];
}
