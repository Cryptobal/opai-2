import { listarModulos, type EventoDeDominio } from "../module";

/**
 * Eventos que emite el núcleo (ADR-029). Con los `eventos` de los manifests forman el catálogo al
 * que se suscriben consumidores, Comunicaciones y agentes. Un evento nuevo del núcleo se declara
 * aquí antes de emitirse (lo verifica un test sobre el código fuente).
 */
export const EVENTOS_CORE: readonly EventoDeDominio[] = [
  { id: "core.cuenta.creada", descripcion: "Se creó una cuenta (cliente o prospecto)." },
  { id: "core.cuenta.actualizada", descripcion: "Cambiaron los datos de una cuenta." },
  {
    id: "core.cuenta.estado_cambiado",
    descripcion: "Una cuenta pasó a cliente activo, inactivo o prospecto.",
  },
  { id: "core.cuenta.archivada", descripcion: "Se archivó una cuenta." },
  { id: "core.contacto.creado", descripcion: "Se agregó un contacto a una cuenta." },
  { id: "core.contacto.actualizado", descripcion: "Cambiaron los datos de un contacto." },
  { id: "core.instalacion.creada", descripcion: "Se creó una instalación de una cuenta." },
  { id: "core.instalacion.actualizada", descripcion: "Cambiaron los datos de una instalación." },
  { id: "core.instalacion.estado_cambiado", descripcion: "Una instalación cambió de estado." },
  { id: "core.instalacion.archivada", descripcion: "Se archivó una instalación." },
  { id: "core.puesto.creado", descripcion: "Se creó un puesto en una instalación." },
  { id: "core.puesto.actualizado", descripcion: "Cambió un puesto (horario, dotación o estado)." },
  { id: "core.patron.creado", descripcion: "Se creó un patrón de turno del catálogo." },
  { id: "core.patron.actualizado", descripcion: "Cambió un patrón de turno (nombre, ciclo o estado)." },
  { id: "core.funcion.creada", descripcion: "Se creó una función de puesto del catálogo." },
  { id: "core.funcion.actualizada", descripcion: "Cambió una función de puesto (nombre o estado)." },
  { id: "core.persona.creada", descripcion: "Se registró una persona (trabajador)." },
  { id: "core.persona.actualizada", descripcion: "Cambiaron los datos de una persona." },
  { id: "core.persona.bloqueada", descripcion: "Se bloqueó a una persona, con motivo." },
  { id: "core.persona.desbloqueada", descripcion: "Se desbloqueó a una persona." },
  { id: "core.persona.archivada", descripcion: "Se archivó a una persona sin vínculo vigente." },
  {
    id: "core.persona.no_recontratar_vencida",
    descripcion: "Venció una o más marcas P1 «No recontratar» y se limpiaron.",
  },
  { id: "core.vinculo.actualizado", descripcion: "Cambió el contrato; snapshot para el borrador de anexo del PR 4." },
  { id: "core.vinculo.creado", descripcion: "Comenzó un vínculo laboral." },
  { id: "core.vinculo.terminado", descripcion: "Terminó un vínculo laboral." },
  { id: "core.cargo.creado", descripcion: "Se creó un cargo." },
  { id: "core.cargo.actualizado", descripcion: "Cambió un cargo o su estado." },
  { id: "core.estructura.creada", descripcion: "Se creó una versión de estructura de sueldo." },
  { id: "core.estructura.anulada", descripcion: "Se anuló una estructura de sueldo." },
  {
    id: "core.anexo.generado",
    descripcion: "Se generó el borrador de un anexo de contrato (capa, monto, instalación o rol).",
  },
  {
    id: "core.anexo.aprobado",
    descripcion: "RRHH aprobó un anexo de contrato; su documento final quedó en Documentos.",
  },
  { id: "core.anexo.rechazado", descripcion: "RRHH rechazó un anexo de contrato, con motivo." },
  { id: "core.documento.registrado", descripcion: "Se subió y confirmó un documento." },
  { id: "core.documento.actualizado", descripcion: "Cambiaron los datos de un documento." },
  { id: "core.documento.archivado", descripcion: "Se archivó un documento." },
  { id: "core.documento.por_vencer", descripcion: "Un documento vence dentro del aviso." },
  { id: "core.documento.vencido", descripcion: "Un documento llegó a su fecha de vencimiento." },
  { id: "core.config.cambiada", descripcion: "Cambió un ajuste de configuración." },
  {
    id: "core.modulo.solicitado",
    descripcion: "La empresa pidió a OPAI activar un módulo (lo activa plataforma).",
  },
  {
    id: "core.empresa.actualizada",
    descripcion: "Cambió el perfil legal o de contacto de la empresa.",
  },
  { id: "core.marca.actualizada", descripcion: "Cambió la marca de la empresa (logos o colores)." },
  {
    id: "core.plantilla.actualizada",
    descripcion: "Se publicó una nueva versión de una plantilla.",
  },
  {
    id: "core.integracion.actualizada",
    descripcion: "Cambió la configuración o un secreto de una integración.",
  },
  { id: "core.integracion.error", descripcion: "La prueba o el uso de una integración falló." },
  {
    id: "core.agente.autonomia_cambiada",
    descripcion: "Cambió la autonomía de un agente (API key).",
  },
  { id: "core.aprobacion.pendiente", descripcion: "Un agente pidió aprobación humana." },
  { id: "core.aprobacion.resuelta", descripcion: "Una aprobación se aprobó o rechazó." },
  {
    id: "core.agente.presupuesto_80",
    descripcion: "Un agente consumió el 80 % de su presupuesto.",
  },
  { id: "core.agente.presupuesto_100", descripcion: "Un agente agotó su presupuesto mensual." },
  { id: "core.usuario.invitado", descripcion: "Se invitó a una persona (correo transaccional)." },
  {
    id: "core.membresia.portal_inicio_fijado",
    descripcion: "Una persona eligió su portal de inicio en la empresa.",
  },
  { id: "core.usuario.invitacion_solicitada", descripcion: "Alguien pidió una nueva invitación." },
  { id: "core.bitacora.rota", descripcion: "La verificación de la bitácora encontró un quiebre." },
  {
    id: "core.auditoria.rota",
    descripcion: "La verificación de la cadena de auditoría encontró un quiebre.",
  },
  {
    id: "core.cumplimiento.dpa_aceptado",
    descripcion: "La empresa aceptó una versión del acuerdo de tratamiento de datos (DPA).",
  },
  {
    id: "core.cumplimiento.dpo_actualizado",
    descripcion: "Cambió el contacto del delegado de protección de datos (DPO).",
  },
  {
    id: "core.cumplimiento.consentimiento_otorgado",
    descripcion: "Un titular otorgó su consentimiento para un fin accesorio.",
  },
  {
    id: "core.cumplimiento.consentimiento_revocado",
    descripcion: "Un titular revocó un consentimiento otorgado antes.",
  },
  {
    id: "core.cumplimiento.solicitud_creada",
    descripcion: "Se registró una solicitud del titular (acceso, rectificación, cancelación…).",
  },
  {
    id: "core.cumplimiento.solicitud_avanzada",
    descripcion: "Una solicitud del titular cambió de estado (p. ej. pasó a en proceso).",
  },
  {
    id: "core.cumplimiento.solicitud_resuelta",
    descripcion: "Una solicitud del titular se resolvió o se rechazó, con evidencia.",
  },
  {
    id: "core.cumplimiento.solicitud_exportada",
    descripcion: "Se generó la exportación de acceso o portabilidad de un titular como documento.",
  },
  {
    id: "core.cumplimiento.incidente_registrado",
    descripcion: "Se registró un incidente de seguridad o una brecha de datos personales.",
  },
  {
    id: "core.cumplimiento.incidente_avanzado",
    descripcion: "Un incidente de seguridad cambió de estado en su atención.",
  },
  {
    id: "core.cumplimiento.brecha_notificada",
    descripcion: "Se dejó constancia del aviso de una brecha a la Agencia o a los titulares.",
  },
  {
    id: "core.cumplimiento.retencion_aplicada",
    descripcion:
      "El trabajo de retención anonimizó o eliminó datos vencidos según la política activa.",
  },
  { id: "core.cumplimiento.dek_rotada", descripcion: "Se rotó la clave de datos del tenant y se recifraron sus secretos." },
  {
    id: "core.cumplimiento.titular_anonimizado",
    descripcion: "Se anonimizó a un titular (persona o contacto) a pedido, conservando los hechos regulados.",
  },
];

/** Catálogo completo: núcleo más los módulos registrados. */
export function catalogoDeEventos(): readonly EventoDeDominio[] {
  return [...EVENTOS_CORE, ...listarModulos().flatMap((m) => m.eventos)];
}

export function eventoDeclarado(tipo: string): boolean {
  return catalogoDeEventos().some((e) => e.id === tipo);
}
