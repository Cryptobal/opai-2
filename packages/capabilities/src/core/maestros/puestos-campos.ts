import { z } from "zod";

import { horasSemanalesSugeridas, horaValida, patronValido, type ClasePatron } from "@opai/domain";

import { diaSchema, textoOpcional } from "./comun";

const hora = z.string().refine(horaValida, 'Hora "HH:mm" de 00:00 a 23:59.');
const horaOpt = hora.nullable().optional();

export const camposPuesto = {
  cargoId: z.uuid(),
  funcionId: z.uuid().nullable().optional().describe("Función operativa del catálogo del tenant."),
  patronId: z.uuid().nullable().optional().describe("Patrón de turno del catálogo del tenant."),
  nombre: z.string().trim().min(2).max(120),
  diasTrabajo: z
    .number()
    .int()
    .min(1)
    .max(28)
    .describe("Días de trabajo del ciclo (lo fija el patrón si se elige)."),
  diasDescanso: z.number().int().min(1).max(28).describe("Días de descanso del ciclo."),
  horaInicio: hora,
  horaFin: hora.describe("Si es menor o igual al inicio, el turno cruza medianoche."),
  horaInicioNoche: horaOpt.describe("Tramo de noche de la rotación día/noche (opcional)."),
  horaFinNoche: horaOpt,
  jornada: z.enum(["dia", "noche", "rotativa"]).optional(),
  horasSemanales: z
    .number()
    .min(0)
    .max(168)
    .nullable()
    .optional()
    .describe("Horas semanales del puesto; si se omite, se sugiere desde el patrón y el horario."),
  colacionMin: z.number().int().min(0).max(240).optional().describe("Minutos de colación."),
  colacionFuera: z.boolean().optional().describe("true si la colación va fuera de la jornada."),
  vigenteDesde: diaSchema.nullable().optional(),
  vigenteHasta: diaSchema.nullable().optional(),
  notas: textoOpcional(2000),
};

/** Valida el patrón combinado con el dominio (en update puede cambiar solo uno de los dos). */
export function errorDePatron(diasTrabajo: number, diasDescanso: number): string | null {
  return patronValido(diasTrabajo, diasDescanso)
    ? null
    : `Patrón ${diasTrabajo}×${diasDescanso} inválido: entre 1×1 y 28×28.`;
}

type PatronCalculo = {
  clase?: string | null;
  diasTrabajo: number;
  diasDescanso: number;
  diasSemana?: number[] | null;
  nombre: string;
} | null;

/** Horas semanales sugeridas con el patrón, los tramos (día y noche) y la colación del puesto. */
export function sugerirHoras(
  patron: PatronCalculo,
  tramos: { horaInicio: string; horaFin: string }[],
  colacionMin: number,
  colacionFuera: boolean,
): number | null {
  if (!patron) return null;
  return horasSemanalesSugeridas({
    patron: {
      nombre: patron.nombre,
      clase: (patron.clase === "semanal" ? "semanal" : "ciclico") as ClasePatron,
      diasTrabajo: patron.diasTrabajo,
      diasDescanso: patron.diasDescanso,
      diasSemana: patron.diasSemana ?? [],
    },
    tramos,
    colacionMin,
    colacionFuera,
  });
}
