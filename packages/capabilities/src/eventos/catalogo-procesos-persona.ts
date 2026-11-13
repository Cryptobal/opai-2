import type { EventoDeDominio } from "../module";

/** Listas de ingreso y salida de una persona (CAR-355). */
export const EVENTOS_PROCESOS_PERSONA: readonly EventoDeDominio[] = [
  { id: "core.persona.proceso_abierto", descripcion: "Se abrió la lista de ingreso o de salida de una persona." },
  { id: "core.persona.proceso_paso_actualizado", descripcion: "Cambió un paso de la lista de ingreso o de salida." },
];
