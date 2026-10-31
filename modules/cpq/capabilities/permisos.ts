/** Permisos del módulo CPQ (cpq.md §7, ADR-016). Declarados también en el manifest para la UI. */
export const PERMISO_READ = "cpq:cotizaciones.read";
export const PERMISO_MANAGE = "cpq:cotizaciones.manage";
/** Ver costos, sueldos y margen; sin él el servidor los omite en pantalla, API y MCP (R59). */
export const PERMISO_COSTOS = "cpq:costos.ver";
export const PERMISO_APROBAR = "cpq:aprobar";
export const PERMISO_MODELO = "cpq:modelo.manage";
