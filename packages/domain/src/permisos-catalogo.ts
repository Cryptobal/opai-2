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
  // CAR-138 PR 7: registrar que un cliente consintió ser referencia comercial. Quién lo tiene es una
  // decisión pendiente de Carlos: por defecto solo owner y admin; cada empresa lo da o quita con roles
  // personalizados y excepciones por usuario. Revocar es la dirección segura y basta `cuentas.manage`.
  cuentasReferenciasAutorizar: "core:cuentas.referencias.autorizar",
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
  // P1 "No recontratar" (Personas y Cargos PR 1): marcar y ver la marca es de RRHH y administradores;
  // el resto no ve ni que la sección existe (denegado explícito a gerente, fuera del allowlist de
  // supervisor y viewer).
  personasNoRecontratarManage: "core:personas.no_recontratar.manage",
  // Personas y Cargos PR 2: previsión, pago bancario (aprobación RRHH) y ficha laboral ampliada.
  personasPrevisionRead: "core:personas.prevision.read",
  personasPrevisionManage: "core:personas.prevision.manage",
  personasPagoRead: "core:personas.pago.read",
  personasPagoManage: "core:personas.pago.manage",
  personasPagoAprobar: "core:personas.pago.aprobar",
  personasLaboralRead: "core:personas.laboral.read",
  personasLaboralManage: "core:personas.laboral.manage",
  estructurasRead: "core:estructuras.read",
  estructurasManage: "core:estructuras.manage",
  estructurasReadSensible: "core:estructuras.read_sensible",
  // Brief 07b · PR 4: anexo de contrato en borrador. Trae snapshots con datos de sueldo, con el
  // mismo bloqueo financiero que las capas y el vínculo (D8; solo owner y admin hasta el 07c).
  anexosRead: "core:anexos.read",
  anexosManage: "core:anexos.manage",
  documentosRead: "core:documentos.read",
  documentosManage: "core:documentos.manage",
  // CAR-127 (decisión de Carlos, 9-nov-2026): ver y editar las plantillas laborales de Documentos.
  // Solo owner y admin (el gerente lo tiene denegado); sin él la pestaña Plantillas se oculta.
  documentosPlantillasManage: "core:documentos.plantillas.manage",
  // CAR-182 (decisión de Carlos, 4-nov-2026): subir documentos SOLO vinculados a una instalación a
  // cargo del actor (ADR-022). No gestiona nada más: quien tiene `documentos.manage` conserva todo.
  // La capacidad de subida lo acepta como alternativa y limita el destino y la visibilidad.
  documentosSubirAlcance: "core:documentos.subir_alcance",
  // Firma electrónica del núcleo (firma.md §8, CAR-82). Enviar y leer solicitudes; configurar la
  // política por tipo de documento (solo owner/admin); registrar el estado del finiquito en la DT.
  // Firmar y rechazar como firmante son actos personales sin permiso de rol (soloPersonas).
  firmasEnviar: "core:firmas.enviar",
  firmasRead: "core:firmas.read",
  firmasConfig: "core:firmas.config",
  finiquitosManage: "core:finiquitos.manage",
  configRead: "core:config.read",
  configManage: "core:config.manage",
  marcaManage: "core:marca.manage",
  integracionesManage: "core:integraciones.manage",
  // Avisos de terreno en Slack (CAR-294): tomar, cerrar y pedir refuerzo. Owner, admin, gerente y supervisor.
  avisosTerrenoGestionar: "core:avisos_terreno.gestionar",
  comunicacionesManage: "core:comunicaciones.manage",
  consumosRead: "core:consumos.read",
  aprobacionesManage: "core:aprobaciones.manage",
  agentesManage: "core:agentes.manage",
  // Brief 07d · Ley 21.719 (DPA/DPO, RAT). Gestionar (DPO, pie legal) es de owner/admin;
  // aceptar el DPA es acto del owner del tenant (responsable del tratamiento, §16.1), solo owner.
  cumplimientoRead: "core:cumplimiento.read",
  cumplimientoManage: "core:cumplimiento.manage",
  cumplimientoDpaAceptar: "core:cumplimiento.dpa_aceptar",
  // Calendario hábil y feriados del Núcleo (CAR-79). Ver lo tienen todos los roles internos (viewer
  // por el comodín `*:*.read`); gestionar (agregar, editar, archivar días) es de owner y admin.
  calendarioRead: "core:calendario.read",
  calendarioManage: "core:calendario.manage",
  remuneracionesRead: "core:remuneraciones.read",
  remuneracionesManage: "core:remuneraciones.manage",
  remuneracionesAprobar: "core:remuneraciones.aprobar",
  remuneracionesRetroactivo: "core:remuneraciones.retroactivo",
  // CRM PR 2a (CAR-26): actividad unificada y etiquetas del tenant. Registrar y asignar es de quien
  // gestiona Comercial; el catálogo de etiquetas (crear, renombrar, borrar) es de owner y admin.
  actividadesRead: "core:actividades.read",
  actividadesManage: "core:actividades.manage",
  // Eliminar actividades de otras personas (la propia siempre se puede): owner y admin.
  actividadesAdmin: "core:actividades.admin",
  etiquetasRead: "core:etiquetas.read",
  etiquetasManage: "core:etiquetas.manage",
  etiquetasConfig: "core:etiquetas.config",
  // CAR-233: bandeja «sin asignar» del historial de correos del cliente (verla y asociar a mano). Quién
  // lo tiene es DECISIÓN CARLOS: por defecto solo owner y admin, porque la bandeja muestra correos que
  // todavía no pertenecen a ninguna ficha (sin alcance que filtrar). El historial de cada ficha usa
  // `actividades.read` y el alcance de la ficha.
  correosSinAsignar: "core:correos.sin_asignar",
  // CAR-305 (ADR-094): ver el catálogo de indicadores de gestión y medir a otras personas. Decisión de
  // Carlos (11-nov-2026): el resultado lo ven la persona, su jefatura y la gerencia. Mientras no exista
  // la jefatura por cargo (CAR-314) lo tienen owner, admin y gerente; viewer y supervisor no.
  indicadoresGestionRead: "core:indicadores_gestion.read",
  // CAR-279: importar datos desde planillas. Decisión de Carlos (11-nov-2026): también el gerente;
  // supervisor y viewer no. Además se exige el permiso de cada entidad que se importa.
  importarManage: "core:importar.manage",
} as const;

export const PERMISOS_PLATAFORMA = {
  tenantsRead: "platform:tenants.read",
  tenantsManage: "platform:tenants.manage",
  modulesManage: "platform:modules.manage",
  /** Asignar o quitar el rol de plataforma de un usuario: solo owner de plataforma (ADR-055). */
  rolesManage: "platform:roles.manage",
} as const;
