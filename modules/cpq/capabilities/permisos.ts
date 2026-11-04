/** Permisos del módulo CPQ (cpq.md §7, ADR-016). Declarados también en el manifest para la UI. */
export const PERMISO_READ = "cpq:cotizaciones.read";
export const PERMISO_MANAGE = "cpq:cotizaciones.manage";
/** Ver costos, sueldos y margen; sin él el servidor los omite en pantalla, API y MCP (R59). */
export const PERMISO_COSTOS = "cpq:costos.ver";
export const PERMISO_APROBAR = "cpq:aprobar";
export const PERMISO_MODELO = "cpq:modelo.manage";
/** Editar/publicar bloques de biblioteca y plantilla de propuesta técnica (CAR-144). */
export const PERMISO_BIBLIOTECA = "cpq:biblioteca.manage";
/** Aprobar envíos conjuntos cotización/propuesta (CAR-144). */
export const PERMISO_ENVIOS_APROBAR = "cpq:envios.aprobar";
/** Confirmar la creación de puestos de una cotización aceptada (R2): decide RRHH, no un agente. */
export const PERMISO_PUESTOS_CONFIRMAR = "cpq:puestos.confirmar";
