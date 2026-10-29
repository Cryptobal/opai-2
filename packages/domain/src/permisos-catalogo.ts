// Catálogo de permisos del núcleo y de plataforma (ADR-016). Los módulos declaran los suyos.

/** Permisos del núcleo. Los módulos declaran los suyos en su manifest. */
export const PERMISOS_CORE = {
  tenantRead: "core:tenant.read",
  tenantManage: "core:tenant.manage",
  tenantDelete: "core:tenant.delete",
  usersRead: "core:users.read",
  usersManage: "core:users.manage",
  /** Restablecer el segundo factor de otro usuario (CAR-54): solo owner, nunca admin. */
  usersMfaReset: "core:users.mfa_reset",
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
  vinculosRead: "core:vinculos.read",
  vinculosManage: "core:vinculos.manage",
  personasManage: "core:personas.manage",
  estructurasRead: "core:estructuras.read",
  estructurasManage: "core:estructuras.manage",
  estructurasReadSensible: "core:estructuras.read_sensible",
  // Brief 07b · PR 4: anexo de contrato en borrador. Trae snapshots con datos de sueldo, con el
  // mismo bloqueo financiero que las capas y el vínculo (D8; solo owner y admin hasta el 07c).
  anexosRead: "core:anexos.read",
  anexosManage: "core:anexos.manage",
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
  // Brief 07d · Ley 21.719 (DPA/DPO, RAT). Gestionar (DPO, pie legal) es de owner/admin;
  // aceptar el DPA es acto del owner del tenant (responsable del tratamiento, §16.1), solo owner.
  cumplimientoRead: "core:cumplimiento.read",
  cumplimientoManage: "core:cumplimiento.manage",
  cumplimientoDpaAceptar: "core:cumplimiento.dpa_aceptar",
} as const;

export const PERMISOS_PLATAFORMA = {
  tenantsRead: "platform:tenants.read",
  tenantsManage: "platform:tenants.manage",
  modulesManage: "platform:modules.manage",
  /** Asignar o quitar el rol de plataforma de un usuario: solo owner de plataforma (ADR-055). */
  rolesManage: "platform:roles.manage",
  /** Restablecer el segundo factor de un usuario de cualquier empresa (CAR-54, I-15). */
  usersManage: "platform:users.manage",
} as const;
