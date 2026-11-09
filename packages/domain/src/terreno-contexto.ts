/** Contexto de un equipo de terreno: qué turnos hay en su instalación ahora (CAR-78 · E2). Aritmética pura. */

/** Se muestran los turnos que terminaron hace poco (cambio de turno) y los que empiezan en las próximas horas. */
export const TURNO_RECIENTE_MS = 2 * 3_600_000;
export const TURNO_PROXIMO_MS = 12 * 3_600_000;

export type EstadoTurno = "en_curso" | "proximo" | "terminado";

/** En curso si `ahora` cae en [inicio, fin): el intervalo es cerrado a la izquierda y abierto a la derecha. */
export function estadoDelTurno(inicio: Date, fin: Date, ahora: Date): EstadoTurno {
  if (ahora.getTime() < inicio.getTime()) return "proximo";
  if (ahora.getTime() >= fin.getTime()) return "terminado";
  return "en_curso";
}

/** Ventana de consulta de turnos alrededor de `ahora`: [ahora − reciente, ahora + próximo]. */
export function ventanaDeTurnos(ahora: Date): { desde: Date; hasta: Date } {
  return {
    desde: new Date(ahora.getTime() - TURNO_RECIENTE_MS),
    hasta: new Date(ahora.getTime() + TURNO_PROXIMO_MS),
  };
}
