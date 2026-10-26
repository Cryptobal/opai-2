// Catálogo de permisos del núcleo y de plataforma (ADR-016). Los módulos declaran los suyos.

/** Permisos del núcleo. Los módulos declaran los suyos en su manifest. */
export const PERMISOS_CORE = {
  tenantRead: "core:tenant.read",
  tenantManage: "core:tenant.manage",
  tenantDelete: "core:tenant.delete",
  usersRead: "core:users.read",
  usersManage: "core:users.manage",
  ownersManage: "core:owners.manage",
  apikeysManage: "core:apikeys.manage",
  auditRead: "core:audit.read",
  // Brief 02: maestros, documentos y servicios del núcleo.
  cuentasRead: "core:cuentas.read",
  cuentasManage: "core:cuentas.manage",
  instalacionesRead: "core:instalaciones.read",
  instalacionesManage: "core:instalaciones.manage",
  // Puestos (Brief 11): catálogos de patrones de turno y funciones, con lectura, edición y
  // desactivación separadas (permisos finos del #47). viewer lee por el comodín `*:*.read`.
  patronesRead: "core:patrones.read",
  patronesManage: "core:patrones.manage",
  patronesDesactivar: "core:patrones.desactivar",
  funcionesRead: "core:funciones.read",
  funcionesManage: "core:funciones.manage",
  funcionesDesactivar: "core:funciones.desactivar",
  personasRead: "core:personas.read",
  personasManage: "core:personas.manage",
  estructurasRead: "core:estructuras.read",
  estructurasManage: "core:estructuras.manage",
  estructurasReadSensible: "core:estructuras.read_sensible",
  documentosRead: "core:documentos.read",
  documentosManage: "core:documentos.manage",
  configRead: "core:config.read",
  configManage: "core:config.manage",
  marcaManage: "core:marca.manage",
  integracionesManage: "core:integraciones.manage",
  comunicacionesManage: "core:comunicaciones.manage",
  consumosRead: "core:consumos.read",
  aprobacionesManage: "core:aprobaciones.manage",
  agentesManage: "core:agentes.manage",
} as const;

export const PERMISOS_PLATAFORMA = {
  tenantsRead: "platform:tenants.read",
  tenantsManage: "platform:tenants.manage",
  modulesManage: "platform:modules.manage",
} as const;
