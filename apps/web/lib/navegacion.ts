import { listarModulos } from "@opai/capabilities";
import { PERMISOS_CORE, type Vocabulario } from "@opai/domain";

/** Ítem de navegación serializable (el icono se nombra; el cliente lo resuelve). */
export type ItemNav = {
  href: string;
  etiqueta: string;
  icono: string;
  grupo?: string;
  corta?: string;
  /** Activo solo en la ruta exacta. */
  exacta?: boolean;
  /** Prefijo extra bajo el cual el ítem también queda activo (detalle que su `href` no cubre). */
  activoEn?: string;
  pie?: boolean;
  soloCompacto?: boolean;
  soloAmplio?: boolean;
  /** Fuera de la barra inferior del teléfono: va a "Más" (sigue en el riel y en la barra lateral). */
  fueraInferior?: boolean;
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
 *
 * `puede` son los permisos EFECTIVOS del usuario (rol personalizado y excepciones, ADR-022), no el
 * rol base: con un rol personalizado o una excepción el rol base escondía secciones concedidas o
 * mostraba secciones denegadas (I4/P4 de la QA del PR #60). El borde lo arma con
 * `puedeDeIdentidad`/`construirPuede`, la misma regla que `crearContexto` usa para autorizar.
 */
export function navegacionErp(
  puede: (permiso: string) => boolean,
  modulosActivos: readonly string[],
  voc: Vocabulario,
): ItemNav[] {
  const items: ItemNav[] = [{ href: "/", etiqueta: "Inicio", icono: "Home" }];
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
      // Respaldo de la barra inferior (Brief 05): en el teléfono va a "Más"; sigue en el riel y en la lateral.
      fueraInferior: true,
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
  // «Empresas» cubre el índice (`/platform`) y el detalle de un tenant (`/platform/tenants/:id`),
  // pero no las demás secciones (`exacta` evita marcarlo en Trabajos, Consumos y Ajustes) (H5).
  {
    href: "/platform",
    etiqueta: "Empresas",
    icono: "Building2",
    exacta: true,
    activoEn: "/platform/tenants",
  },
  { href: "/platform/trabajos", etiqueta: "Trabajos", icono: "Clock" },
  { href: "/platform/consumos", etiqueta: "Consumos", icono: "Gauge" },
  { href: "/platform/ajustes", etiqueta: "Ajustes", icono: "SlidersHorizontal", pie: true },
];

/** Portales sin módulos todavía (fase 3): su inicio; Supervisor suma las vistas de terreno (55/56). */
export function navegacionPortal(href: string, portal?: string): ItemNav[] {
  if (portal === "supervisor")
    return [
      // «Hoy» solo en `/supervisor`, pero la ficha de persona (`/supervisor/personas/:id`) cuelga de
      // «Hoy» (se llega por «Atrás → Hoy»), así que `activoEn` la mantiene marcada (H6, t365u/t366u).
      { href, etiqueta: "Hoy", icono: "Home", exacta: true, activoEn: "/supervisor/personas" },
      {
        href: "/supervisor/instalaciones",
        etiqueta: "Instalaciones",
        corta: "Instalac.",
        icono: "MapPin",
      },
    ];
  return [{ href, etiqueta: "Inicio", icono: "Home" }];
}
