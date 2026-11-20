import type { EventoDeDominio } from "../module";

/** Eventos de persona en maestros (reclutamiento CAR-674 y ciclo operativo). */
export const EVENTOS_PERSONA_MAESTROS: readonly EventoDeDominio[] = [
  { id: "core.persona.creada", descripcion: "Se registró una persona (trabajador)." },
  { id: "core.persona.actualizada", descripcion: "Cambiaron los datos de una persona." },
  { id: "core.persona.bloqueada", descripcion: "Se bloqueó a una persona, con motivo." },
  { id: "core.persona.desbloqueada", descripcion: "Se desbloqueó a una persona." },
  { id: "core.persona.archivada", descripcion: "Se archivó a una persona sin vínculo vigente." },
  { id: "core.persona.estado_cambiado", descripcion: "Cambió el estado de reclutamiento u operación de la persona." },
  { id: "core.persona.bloqueada_permanente", descripcion: "Quedó bloqueada de forma permanente (no recontratable)." },
  { id: "core.persona.desbloqueada_permanente", descripcion: "Se levantó el bloqueo permanente (solo admin)." },
  { id: "core.persona.no_recontratar_vencida", descripcion: "Venció una marca P1 «No recontratar» y se limpió." },
];