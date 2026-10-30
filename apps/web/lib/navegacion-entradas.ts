import { listarModulos } from "@opai/capabilities";
import { type AreaNav, PERMISOS_CORE, type Rol, type Vocabulario } from "@opai/domain";

import type { EntradaArea } from "./navegacion-areas";

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Área principal por defecto del rol (§3 de `NAVEGACION.md`, sin la columna "Buscar"). Si el área
 *  no tiene entradas visibles, `entradasAreaPrincipal` cae a la primera disponible, sin error (§10). */
export function areaPrincipalPorRol(rol: Rol): AreaNav {
  if (rol === "supervisor") return "operaciones";
  if (rol === "viewer") return "clientes";
  return "comercial";
}

/** Entradas del núcleo (Brief 05, §4.3): Inicio suelta, Clientes y Personas con sus permisos. */
export function entradasNucleo(voc: Vocabulario): EntradaArea[] {
  return [
    { area: "inicio", href: "/", etiqueta: "Inicio", icono: "Home", modulo: "core" },
    {
      area: "clientes",
      href: "/cuentas",
      etiqueta: "Cuentas",
      icono: "Building2",
      modulo: "core",
      permiso: PERMISOS_CORE.cuentasRead,
      orden: 1,
    },
    {
      area: "clientes",
      href: "/instalaciones",
      etiqueta: mayuscula(voc.instalacion.plural),
      icono: "MapPin",
      modulo: "core",
      permiso: PERMISOS_CORE.instalacionesRead,
      orden: 2,
    },
    {
      area: "personas",
      href: "/personas",
      etiqueta: "Personas",
      icono: "Users",
      modulo: "core",
      permiso: PERMISOS_CORE.personasRead,
      orden: 1,
    },
    {
      area: "personas",
      href: "/cargos",
      etiqueta: "Cargos",
      icono: "Briefcase",
      modulo: "core",
      permiso: PERMISOS_CORE.estructurasRead,
      orden: 2,
    },
    {
      area: "documentos",
      href: "/documentos/firmas",
      etiqueta: "Firmas",
      icono: "PenLine",
      modulo: "core",
      permiso: PERMISOS_CORE.firmasRead,
      orden: 1,
    },
  ];
}

/** Acción de ⌘K. Solo navega (§7): nunca ejecuta una escritura directa. */
export type AccionCmdK = { id: string; href: string; etiqueta: string; icono: string };

type CandidataAccion = AccionCmdK & { modulo: string; permiso: string | null };

/** Acciones del núcleo para ⌘K (§7): solo navegan al formulario, igual que los accesos de Inicio. */
function accionesNucleo(persona: string): CandidataAccion[] {
  return [
    {
      id: "core.nueva-cuenta",
      href: "/cuentas?nueva=1",
      etiqueta: "Nueva cuenta",
      icono: "Building2",
      modulo: "core",
      permiso: PERMISOS_CORE.cuentasManage,
    },
    {
      id: "core.agregar-persona",
      href: "/personas?nueva=1",
      etiqueta: `Agregar ${persona}`,
      icono: "Users",
      modulo: "core",
      permiso: PERMISOS_CORE.personasManage,
    },
    {
      id: "core.nueva-instalacion",
      href: "/instalaciones/nueva",
      etiqueta: "Nueva instalación",
      icono: "MapPin",
      modulo: "core",
      permiso: PERMISOS_CORE.instalacionesManage,
    },
  ];
}

function accionesModulos(): CandidataAccion[] {
  const items: CandidataAccion[] = [];
  for (const m of listarModulos()) {
    for (const a of m.acciones ?? []) {
      items.push({
        id: `${m.id}.${a.href}`,
        href: a.href,
        etiqueta: a.etiqueta,
        icono: a.icono,
        modulo: m.id,
        permiso: a.permiso ?? null,
      });
    }
  }
  return items;
}

/** Acciones visibles de ⌘K (§7, §12 "viewer sin acciones de escritura"): filtradas igual que la
 *  navegación, por módulo activo y permiso. */
export function accionesErp(
  persona: string,
  puede: (permiso: string) => boolean,
  modulosActivos: readonly string[],
): AccionCmdK[] {
  const activos = new Set(["core", ...modulosActivos]);
  return [...accionesNucleo(persona), ...accionesModulos()]
    .filter((a) => activos.has(a.modulo) && (a.permiso == null || puede(a.permiso)))
    .map(({ id, href, etiqueta, icono }) => ({ id, href, etiqueta, icono }));
}

/** Entradas de los módulos activos (manifest `navegacion`, Brief 05, §4.3). */
export function entradasModulos(): EntradaArea[] {
  const items: EntradaArea[] = [];
  for (const m of listarModulos()) {
    for (const x of m.navegacion) {
      if (x.portal !== "erp" || x.area == null) continue;
      items.push({
        area: x.area as AreaNav,
        href: x.href,
        etiqueta: x.etiqueta,
        icono: x.icono,
        modulo: m.id,
        permiso: x.permiso ?? null,
        ...(x.orden !== undefined ? { orden: x.orden } : {}),
      });
    }
  }
  return items;
}
