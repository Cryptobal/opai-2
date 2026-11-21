import { type AccesoRuta } from "@opai/domain/novedades";
import { ENTITLEMENT_NAV, PERMISOS_CORE } from "@opai/domain";

import { listarModulos } from "../../module";

/** Pantallas del núcleo con su permiso, las mismas del menú (`apps/web/lib/navegacion-entradas.ts`). */
const NUCLEO: readonly AccesoRuta[] = [
  { href: "/cuentas", modulo: "core", permiso: PERMISOS_CORE.cuentasRead },
  { href: "/instalaciones", modulo: "core", permiso: PERMISOS_CORE.instalacionesRead },
  { href: "/personas", modulo: "core", permiso: PERMISOS_CORE.personasRead },
  { href: "/documentos", modulo: "core", permiso: PERMISOS_CORE.documentosRead },
  { href: "/documentos/firmas", modulo: "core", permiso: PERMISOS_CORE.firmasRead },
];

/**
 * Tabla ruta → módulo y permiso para recortar las novedades por lo que cada persona ve en el menú
 * (CAR-430): núcleo más las entradas ERP que declara cada módulo en su manifest.
 */
/** Rutas con complemento vendible aunque el manifest del módulo no esté cargado (tests unitarios). */
function rutasEntitlement(): AccesoRuta[] {
  return Object.entries(ENTITLEMENT_NAV).map(([href, modulo]) => ({
    href,
    modulo,
    permiso: null,
  }));
}

export function accesosPorRuta(): AccesoRuta[] {
  const modulos = listarModulos().flatMap((m) =>
    m.navegacion
      .filter((n) => n.portal === "erp")
      .map((n) => ({ href: n.href, modulo: ENTITLEMENT_NAV[n.href] ?? m.id, permiso: n.permiso ?? null })),
  );
  const porHref = new Map<string, AccesoRuta>();
  for (const a of [...NUCLEO, ...modulos, ...rutasEntitlement()]) {
    const prev = porHref.get(a.href);
    porHref.set(a.href, prev && prev.permiso && !a.permiso ? prev : a);
  }
  return [...porHref.values()];
}
