import { z } from "zod";

import { etiquetaHorario, horaValida, patronValido } from "@opai/domain";

import { dia, diaSchema, textoOpcional } from "./comun";

export const puestoSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  cargoId: z.string(),
  nombre: z.string(),
  diasTrabajo: z.number(),
  diasDescanso: z.number(),
  horaInicio: z.string(),
  horaFin: z.string(),
  horario: z.string().describe('Texto legible: "20:00 – 08:00 (+1)".'),
  jornada: z.string(),
  dotacion: z.number(),
  estado: z.string(),
  vigenteDesde: z.string().nullable(),
  vigenteHasta: z.string().nullable(),
  notas: z.string().nullable(),
});

export type FilaPuesto = {
  id: string;
  instalacionId: string;
  cargoId: string;
  nombre: string;
  diasTrabajo: number;
  diasDescanso: number;
  horaInicio: string;
  horaFin: string;
  jornada?: string | null;
  dotacion?: number | null;
  estado?: string | null;
  vigenteDesde?: Date | null;
  vigenteHasta?: Date | null;
  notas?: string | null;
};

export const vistaPuesto = (p: FilaPuesto) => ({
  id: p.id,
  instalacionId: p.instalacionId,
  cargoId: p.cargoId,
  nombre: p.nombre,
  diasTrabajo: p.diasTrabajo,
  diasDescanso: p.diasDescanso,
  horaInicio: p.horaInicio,
  horaFin: p.horaFin,
  horario: etiquetaHorario(p.horaInicio, p.horaFin),
  jornada: p.jornada ?? "dia",
  dotacion: p.dotacion ?? 1,
  estado: p.estado ?? "activo",
  vigenteDesde: dia(p.vigenteDesde),
  vigenteHasta: dia(p.vigenteHasta),
  notas: p.notas ?? null,
});

const hora = z.string().refine(horaValida, 'Hora "HH:mm" de 00:00 a 23:59.');

export const camposPuesto = {
  cargoId: z.uuid(),
  nombre: z.string().trim().min(2).max(120),
  diasTrabajo: z.number().int().min(1).max(28).describe("Días de trabajo del ciclo (4 en 4×4)."),
  diasDescanso: z.number().int().min(1).max(28).describe("Días de descanso del ciclo."),
  horaInicio: hora,
  horaFin: hora.describe("Si es menor o igual al inicio, el turno cruza medianoche."),
  jornada: z.enum(["dia", "noche", "rotativa"]).optional(),
  dotacion: z.number().int().min(1).max(500).optional(),
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
