import { listarModulos } from "@opai/capabilities";
import { PERMISOS_CORE, tienePermiso, type Rol, type Vocabulario } from "@opai/domain";

/** Ítem de navegación serializable (el icono se nombra; el cliente lo resuelve). */
export type ItemNav = {
  href: string;
  etiqueta: string;
  icono: string;
  grupo?: string;
  corta?: string;
  contador?: number;
  pie?: boolean;
  soloCompacto?: boolean;
  soloAmplio?: boolean;
  alerta?: boolean;
};

/** Conteos de `core.resumen.contadores` (null sin permiso). Los usan Inicio y las listas, no la barra lateral. */
export type Contadores = {
  cuentas: number | null;
  instalaciones: number | null;
  personas: number | null;
  aprobacionesPendientes: number | null;
  notificacionesNoLeidas: number | null;
};

const esDesarrollo = process.env.NODE_ENV !== "production";
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Navegación del ERP (diseño de maestros): Inicio, maestros, módulos activos y una sola entrada
 * "Configuración" fija al pie (ADR-018). Los nombres pasan por el vocabulario. Sin contadores en la
 * barra lateral (ADR-045, decisión 15 de Carlos del 24-oct): los conteos quedan en Inicio y en las
 * listas, no se cargan por navegación.
 */
export function navegacionErp(
  rol: Rol | null,
  modulosActivos: readonly string[],
  voc: Vocabulario,
): ItemNav[] {
  const items: ItemNav[] = [{ href: "/", etiqueta: "Inicio", icono: "Home" }];
  if (!rol) return items;
  const puede = (p: string) => tienePermiso(rol, p);
  const grupo = "Maestros";
  if (puede(PERMISOS_CORE.cuentasRead))
    items.push({ href: "/cuentas", etiqueta: "Cuentas", icono: "Building2", grupo });
  if (puede(PERMISOS_CORE.instalacionesRead))
    items.push({
      href: "/instalaciones",
      etiqueta: mayuscula(voc.instalacion.plural),
      corta: "Instalac.",
      icono: "MapPin",
      grupo,
    });
  if (puede(PERMISOS_CORE.personasRead))
    items.push({ href: "/personas", etiqueta: "Personas", icono: "Users", grupo });
  if (puede(PERMISOS_CORE.estructurasRead))
    items.push({
      href: "/cargos",
      etiqueta: "Cargos y sueldos",
      corta: "Cargos",
      icono: "Briefcase",
      grupo,
      soloAmplio: true,
    });
  for (const m of listarModulos()) {
    if (!modulosActivos.includes(m.id)) continue;
    if (!m.permisos.some((p) => puede(p.id))) continue;
    const entradas = m.navegacion.filter((x) => x.portal === "erp");
    for (const x of [...entradas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
      items.push({ href: x.href, etiqueta: x.etiqueta, icono: x.icono, grupo: "Módulos" });
  }
  if (esDesarrollo)
    items.push({ href: "/ds", etiqueta: "Diseño", icono: "Palette", grupo: "Desarrollo" });
  items.push({
    href: "/configuracion",
    etiqueta: "Configuración",
    corta: "Ajustes",
    icono: "Settings",
    pie: true,
  });
  return items;
}

export const NAV_PLATAFORMA: ItemNav[] = [
  { href: "/platform", etiqueta: "Empresas", icono: "Building2" },
  { href: "/platform/trabajos", etiqueta: "Trabajos", icono: "Clock" },
  { href: "/platform/consumos", etiqueta: "Consumos", icono: "Gauge" },
  { href: "/platform/ajustes", etiqueta: "Ajustes", icono: "SlidersHorizontal", pie: true },
];

/** Portales sin módulos todavía (fase 3): su inicio; Supervisor suma las vistas de terreno (55/56). */
export function navegacionPortal(href: string, portal?: string): ItemNav[] {
  if (portal === "supervisor")
    return [
      { href, etiqueta: "Hoy", icono: "Home" },
      {
        href: "/supervisor/instalaciones",
        etiqueta: "Instalaciones",
        corta: "Instalac.",
        icono: "MapPin",
      },
    ];
  return [{ href, etiqueta: "Inicio", icono: "Home" }];
}
