import type { NovedadesLiquidacion } from "@opai/domain";

import type { ResumenAsistenciaPersona } from "../../../../modules/asistencia/capabilities/dias-resumen-periodo";

export type MezclaAsistencia = {
  novedades: NovedadesLiquidacion;
  diasPresentes?: number;
  advertencias: string[];
};

/** Incorpora el resumen de Asistencia a las novedades del cálculo (CAR-601). */
export function mezclarAsistenciaLiquidacion(
  novedades: NovedadesLiquidacion,
  resumen: ResumenAsistenciaPersona | undefined,
): MezclaAsistencia {
  if (!resumen) return { novedades, advertencias: [] };
  const advertencias: string[] = [];
  if (resumen.provisorio) {
    advertencias.push("Resumen de asistencia provisorio: hay correcciones pendientes y los días pueden cambiar.");
  }
  if (resumen.segundosAtraso > 0) {
    const min = Math.round(resumen.segundosAtraso / 60);
    advertencias.push(`Asistencia registra ${min} ${min === 1 ? "minuto" : "minutos"} de atraso en el período.`);
  }
  return {
    novedades: {
      ...novedades,
      diasAusencia: resumen.ausentes,
      minutosExtra: Math.round(resumen.segundosExtra / 60),
    },
    diasPresentes: resumen.presentes,
    advertencias,
  };
}