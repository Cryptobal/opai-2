/** Permisos del módulo Rendiciones (ADR-016). Declarados también en el manifest. */
/** Crear, editar, enviar y anular las rendiciones propias. */
export const PERMISO_RENDIR = "rendiciones:rendir";
/** Aprobar, rechazar o devolver las rendiciones que tienen asignadas (nunca las propias). */
export const PERMISO_APROBAR = "rendiciones:aprobar";
/** Ver todas las rendiciones de la empresa, no solo las propias y las asignadas (ADR-022). */
export const PERMISO_VER_TODAS = "rendiciones:ver_todas";
/** Cambiar la configuración del módulo (respaldo obligatorio, aprobador por defecto). */
export const PERMISO_CONFIG = "rendiciones:config.manage";

/** Portales donde se rinde (ADR-033): el ERP y el portal Supervisor (CAR-197). Aprobar sigue solo en el ERP. */
export const PORTALES_RENDIR = ["erp", "supervisor"] as const;
