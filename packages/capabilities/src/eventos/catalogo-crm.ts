import type { EventoDeDominio } from "../module";

/**
 * Eventos de CRM PR 2a (CAR-26): vínculo contacto–cuenta, actividad unificada y etiquetas; y
 * consentimiento de referencia de clientes (CAR-138 PR 7).
 */
export const EVENTOS_CRM: readonly EventoDeDominio[] = [
  {
    id: "core.cuenta.referencia_otorgada",
    descripcion: "Un cliente consintió ser referencia comercial (o se renovó su consentimiento).",
  },
  {
    id: "core.cuenta.referencia_revocada",
    descripcion: "Se revocó el consentimiento de un cliente para ser referencia comercial.",
  },
  { id: "core.contacto.vinculado", descripcion: "Se vinculó un contacto a otra cuenta." },
  {
    id: "core.contacto.vinculo_actualizado",
    descripcion: "Cambió el cargo, los roles o el principal de un contacto en una cuenta.",
  },
  {
    id: "core.contacto.desvinculado",
    descripcion: "Se quitó el vínculo de un contacto con una cuenta.",
  },
  {
    id: "core.actividad.registrada",
    descripcion: "Se registró una nota, llamada, reunión, visita o tarea.",
  },
  { id: "core.actividad.actualizada", descripcion: "Cambió una actividad." },
  { id: "core.actividad.eliminada", descripcion: "Se eliminó una actividad." },
  {
    id: "core.actividad.tarea_asignada",
    descripcion: "Se asignó una tarea a uno o más responsables.",
  },
  { id: "core.actividad.tarea_completada", descripcion: "Se completó una tarea." },
  {
    id: "core.actividad.tarea_vencida",
    descripcion: "Una tarea pendiente pasó su vencimiento (aviso diario, una vez por vencimiento).",
  },
  { id: "core.etiqueta.creada", descripcion: "Se creó una etiqueta del catálogo." },
  { id: "core.etiqueta.actualizada", descripcion: "Cambió una etiqueta del catálogo." },
  { id: "core.etiqueta.eliminada", descripcion: "Se eliminó una etiqueta del catálogo." },
  {
    id: "core.etiqueta.asignada",
    descripcion: "Se asignaron etiquetas a negocios, cuentas o contactos.",
  },
  {
    id: "core.correo_cliente.registrado",
    descripcion: "Entró un correo a la dirección de registro de la empresa (respuesta o copia oculta); puede quedar sin asignar.",
  },
  {
    id: "core.correo_cliente.asociado",
    descripcion: "Se asoció a mano un correo del historial a una cuenta, contacto o negocio.",
  },
  {
    id: "core.importacion.aplicada",
    descripcion: "Se cargó un lote de datos con el importador (cuentas, contactos, instalaciones o negocios).",
  },
  {
    id: "core.importacion.revertida",
    descripcion: "Se revirtió un lote de importación: se borró lo creado y se restauró lo completado.",
  },
  {
    id: "core.etiqueta.quitada",
    descripcion: "Se quitaron etiquetas de negocios, cuentas o contactos.",
  },
];
