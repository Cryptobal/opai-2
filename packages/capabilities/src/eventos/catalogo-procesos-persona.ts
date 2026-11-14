import type { EventoDeDominio } from "../module";

/**
 * Listas de ingreso y salida de una persona (CAR-355), corte de acceso programado (CAR-385) y respuesta a sus
 * solicitudes de permiso y vacaciones (CAR-508).
 */
export const EVENTOS_PROCESOS_PERSONA: readonly EventoDeDominio[] = [
  { id: "core.persona.proceso_abierto", descripcion: "Se abrió la lista de ingreso o de salida de una persona." },
  { id: "core.persona.proceso_paso_actualizado", descripcion: "Cambió un paso de la lista de ingreso o de salida." },
  {
    id: "core.vinculo.accesos_cortados",
    descripcion: "Llegó la fecha de término de un vínculo terminado con fecha futura y se cortó el acceso de la persona.",
  },
  {
    id: "core.ausencia.respondida",
    descripcion: "Se aprobó o rechazó una solicitud de permiso o vacaciones que la persona hizo desde su portal.",
  },
];
