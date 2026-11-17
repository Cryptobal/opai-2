import { lunesDe } from "./index";

/** Pago proyectado de remuneraciones, tal como lo entrega `nomina.costo_proyectado.listar` (CAR-344). */
export type ItemRemuneracion = {
  fecha: string;
  concepto: "sueldos" | "anticipo" | "previred" | "turnos_extra";
  monto: number;
  personas: number;
  estimado: boolean;
};

/** Filas del flujo que reciben remuneraciones: los turnos extra se pagan con los sueldos. */
export type ConceptoFlujo = "sueldos" | "anticipo" | "previred";

export type CeldaRemuneracion = {
  concepto: ConceptoFlujo;
  semana: string;
  monto: number;
  /** Fechas de pago que suma la celda, ordenadas. */
  fechas: string[];
  /** Personas del pago más grande de la celda (no se suman entre fechas: serían las mismas personas). */
  personas: number;
  estimado: boolean;
};

const ORDEN: Record<ConceptoFlujo, number> = { sueldos: 0, anticipo: 1, previred: 2 };

/**
 * Agrupa los pagos proyectados por fila y semana del flujo. Solo cuenta lo que se paga desde `desde` (hoy, hora de
 * Chile): lo anterior ya debió salir del banco y lo trae la cartola, así que no se cuenta dos veces. Puro.
 */
export function agruparRemuneraciones(
  items: readonly ItemRemuneracion[],
  opciones: { desde: string; semanas: readonly string[] },
): CeldaRemuneracion[] {
  const enVentana = new Set(opciones.semanas);
  const porClave = new Map<string, CeldaRemuneracion & { mayor: number }>();
  for (const i of items) {
    if (i.monto <= 0 || i.fecha < opciones.desde) continue;
    const semana = lunesDe(i.fecha);
    if (!enVentana.has(semana)) continue;
    const concepto: ConceptoFlujo = i.concepto === "turnos_extra" ? "sueldos" : i.concepto;
    const clave = `${concepto}|${semana}`;
    const previa = porClave.get(clave);
    if (!previa) {
      porClave.set(clave, { concepto, semana, monto: i.monto, fechas: [i.fecha], personas: i.personas, estimado: i.estimado, mayor: i.monto });
      continue;
    }
    previa.monto += i.monto;
    if (!previa.fechas.includes(i.fecha)) previa.fechas.push(i.fecha);
    if (i.monto > previa.mayor) {
      previa.mayor = i.monto;
      previa.personas = i.personas;
    }
    previa.estimado = previa.estimado || i.estimado;
  }
  return [...porClave.values()]
    .map(({ mayor: _mayor, ...c }) => ({ ...c, fechas: [...c.fechas].sort() }))
    .sort((a, b) => a.semana.localeCompare(b.semana) || ORDEN[a.concepto] - ORDEN[b.concepto]);
}
