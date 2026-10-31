import type { EventoDeDominio } from "../module";

/** Eventos de CRM PR 2a (CAR-26): vínculo contacto–cuenta, actividad unificada y etiquetas. */
export const EVENTOS_CRM: readonly EventoDeDominio[] = [
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
  { id: "core.etiqueta.creada", descripcion: "Se creó una etiqueta del catálogo." },
  { id: "core.etiqueta.actualizada", descripcion: "Cambió una etiqueta del catálogo." },
  { id: "core.etiqueta.eliminada", descripcion: "Se eliminó una etiqueta del catálogo." },
  {
    id: "core.etiqueta.asignada",
    descripcion: "Se asignaron etiquetas a negocios, cuentas o contactos.",
  },
  {
    id: "core.etiqueta.quitada",
    descripcion: "Se quitaron etiquetas de negocios, cuentas o contactos.",
  },
];
