import {
  type AreaNav,
  PERMISOS_CORE,
  PERMISOS_PLATAFORMA,
  type Rol,
  type Vocabulario,
} from "@opai/domain";

import {
  armarNavegacion,
  entradaInicio,
  entradasAreaPrincipal,
  type EntradaArea,
  type GrupoArea,
} from "./navegacion-areas";
import {
  accionesErp,
  type AccionCmdK,
  areaPrincipalPorRol,
  entradasModulos,
  entradasNucleo,
} from "./navegacion-entradas";

/** Ítem de navegación serializable (el icono se nombra; el cliente lo resuelve). */
export type ItemNav = {
  href: string;
  etiqueta: string;
  corta?: string;
  icono: string;
  grupo?: string;
  /** Activo solo en la ruta exacta. */
  exacta?: boolean;
  /** Prefijo extra bajo el cual el ítem también queda activo (detalle que su `href` no cubre). */
  activoEn?: string;
  pie?: boolean;
  /** Solo en la barra lateral de desktop (decisión previa al Brief 05, ESTADO.md): en el riel y en
   *  el teléfono va a "Más". No es parte del modelo de áreas; se aplica al convertir a `ItemNav`. */
  soloAmplio?: boolean;
  /** Área de la entrada (ausente en Inicio y Configuración, que no son áreas). */
  area?: AreaNav;
  /** Muestra el pin al pasar el mouse o con foco (D3). Falso para Inicio y Configuración. */
  fijable?: boolean;
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

/** Resultado de armar la navegación del ERP: lista plana (riel y barra lateral), grupos por área
 *  (acordeón, D1) y la barra inferior ya resuelta con el área principal por defecto del rol (D9/§3,
 *  sin "Buscar": vive en la barra superior del teléfono desde el PR #54, que reemplaza la D7). */
export type NavegacionErp = {
  nav: ItemNav[];
  grupos: GrupoArea[];
  navInferior: ItemNav[];
  /** Acciones de ⌘K (§7), ya filtradas por permiso y módulo activo. */
  acciones: AccionCmdK[];
};

const esDesarrollo = process.env.NODE_ENV !== "production";

function itemDe(e: EntradaArea, extra: Partial<ItemNav> = {}): ItemNav {
  return { href: e.href, etiqueta: e.etiqueta, icono: e.icono, ...extra };
}

/**
 * Navegación del ERP por áreas (ADR-046, Brief 05): Inicio suelta, áreas en acordeón (D1), sin
 * contadores en la barra lateral (D5) y Configuración fija al pie (ADR-018, fuera del modelo de
 * áreas). `puede` ya resuelve permisos finos (rol personalizado + excepciones del #47, ADR-022);
 * `rol` solo decide el área principal por defecto de la barra inferior cuando el usuario no eligió
 * una (§3).
 */
export function navegacionErp(
  rol: Rol | null,
  puede: (permiso: string) => boolean,
  modulosActivos: readonly string[],
  voc: Vocabulario,
  areaPrincipal: AreaNav | null = null,
): NavegacionErp {
  if (!rol) {
    const inicio = itemDe({
      area: "inicio",
      href: "/",
      etiqueta: "Inicio",
      icono: "Home",
      modulo: "core",
    });
    return { nav: [inicio], grupos: [], navInferior: [inicio], acciones: [] };
  }
  const items = [...entradasNucleo(voc), ...entradasModulos()];
  const grupos = armarNavegacion(items, { puede, modulosActivos });
  const nav: ItemNav[] = [];
  for (const g of grupos) {
    for (const e of g.entradas) {
      nav.push(
        itemDe(e, {
          ...(g.area === "inicio" ? {} : { grupo: g.etiqueta }),
          ...(g.area !== "inicio" ? { area: g.area, fijable: true } : {}),
        }),
      );
    }
  }
  if (esDesarrollo) nav.push({ href: "/ds", etiqueta: "Diseño", icono: "Palette" });
  nav.push({ href: "/configuracion", etiqueta: "Configuración", icono: "Settings", pie: true });
  const inicio = entradaInicio(grupos);
  const resto = entradasAreaPrincipal(grupos, areaPrincipal ?? areaPrincipalPorRol(rol));
  const navInferior = [inicio, ...resto]
    .filter((e): e is EntradaArea => e != null)
    .map((e) => itemDe(e));
  const acciones = accionesErp(voc.persona.singular, puede, modulosActivos);
  return { nav, grupos, navInferior, acciones };
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
export function navegacionPortal(
  href: string,
  portal: string,
  puede: (permiso: string) => boolean,
): ItemNav[] {
  if (portal === "platform") return puede(PERMISOS_PLATAFORMA.tenantsRead) ? NAV_PLATAFORMA : [];
  if (portal === "supervisor")
    return [
      // «Hoy» solo en `/supervisor`, pero la ficha de persona (`/supervisor/personas/:id`) cuelga de
      // «Hoy» (se llega por «Atrás → Hoy»), así que `activoEn` la mantiene marcada (H6, t365u/t366u).
      ...(puede(PERMISOS_CORE.documentosRead) && puede(PERMISOS_CORE.personasRead)
        ? [{ href, etiqueta: "Hoy", icono: "Home", exacta: true, activoEn: "/supervisor/personas" }]
        : []),
      ...(puede(PERMISOS_CORE.instalacionesRead)
        ? [{ href: "/supervisor/instalaciones", etiqueta: "Instalaciones", icono: "MapPin" }]
        : []),
    ];
  if (portal === "trabajador")
    return [
      { href, etiqueta: "Inicio", icono: "Home", exacta: true },
      { href: `${href}/mis-datos`, etiqueta: "Mis datos", icono: "UserRound" },
      { href: `${href}/notificaciones`, etiqueta: "Avisos", icono: "Bell" },
      { href: `${href}/mas`, etiqueta: "Más", icono: "Ellipsis", activoEn: `${href}/privacidad` },
    ];
  return [{ href, etiqueta: "Inicio", icono: "Home" }];
}
