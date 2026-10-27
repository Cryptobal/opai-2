import { z } from "zod";

import { etiquetaHorario, resumenPatron, type ClasePatron } from "@opai/domain";

import { dia } from "./comun";

export const puestoSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  cargoId: z.string(),
  funcionId: z.string().nullable(),
  funcion: z.string().nullable().describe("Nombre de la función operativa (guardia, supervisor…)."),
  patronId: z.string().nullable(),
  patron: z.string().nullable().describe('Nombre del patrón de turno (p. ej. "4×4").'),
  patronResumen: z.string().nullable().describe("Resumen legible del patrón para la lista (CAR-8)."),
  nombre: z.string(),
  diasTrabajo: z.number(),
  diasDescanso: z.number(),
  horaInicio: z.string(),
  horaFin: z.string(),
  horario: z.string().describe('Texto legible del tramo de día: "20:00 – 08:00 (+1)".'),
  horaInicioNoche: z.string().nullable(),
  horaFinNoche: z.string().nullable(),
  horarioNoche: z.string().nullable().describe("Texto legible del tramo de noche, si rota."),
  jornada: z.string(),
  horasSemanales: z.number().nullable(),
  colacionMin: z.number(),
  colacionFuera: z.boolean(),
  cobertura: z.string().describe('"ppc" (sin asignar) o "cubierto".'),
  coberturaMotivo: z.string().nullable(),
  dotacion: z.number().describe("DEPRECADO: 1 puesto = 1 posición. Se conserva por compatibilidad."),
  estado: z.string(),
  vigenteDesde: z.string().nullable(),
  vigenteHasta: z.string().nullable(),
  notas: z.string().nullable(),
});

type Relacionado = { nombre: string } | null | undefined;

export type FilaPuesto = {
  id: string;
  instalacionId: string;
  cargoId: string;
  funcionId?: string | null;
  patronId?: string | null;
  nombre: string;
  diasTrabajo: number;
  diasDescanso: number;
  horaInicio: string;
  horaFin: string;
  horaInicioNoche?: string | null;
  horaFinNoche?: string | null;
  jornada?: string | null;
  horasSemanales?: number | string | { toString(): string } | null;
  colacionMin?: number | null;
  colacionFuera?: boolean | null;
  cobertura?: string | null;
  coberturaMotivo?: string | null;
  dotacion?: number | null;
  estado?: string | null;
  vigenteDesde?: Date | null;
  vigenteHasta?: Date | null;
  notas?: string | null;
  funcion?: Relacionado;
  patron?:
    | { nombre: string; clase?: string | null; diasTrabajo: number; diasDescanso: number; diasSemana?: number[] | null }
    | null;
};

function resumenDe(p: FilaPuesto["patron"]): string | null {
  if (!p) return null;
  return resumenPatron({
    nombre: p.nombre,
    clase: (p.clase === "semanal" ? "semanal" : "ciclico") as ClasePatron,
    diasTrabajo: p.diasTrabajo,
    diasDescanso: p.diasDescanso,
    diasSemana: p.diasSemana ?? [],
  });
}

export const vistaPuesto = (p: FilaPuesto) => {
  const noche =
    p.horaInicioNoche && p.horaFinNoche ? etiquetaHorario(p.horaInicioNoche, p.horaFinNoche) : null;
  const horas = p.horasSemanales == null ? null : Number(p.horasSemanales);
  return {
    id: p.id,
    instalacionId: p.instalacionId,
    cargoId: p.cargoId,
    funcionId: p.funcionId ?? null,
    funcion: p.funcion?.nombre ?? null,
    patronId: p.patronId ?? null,
    patron: p.patron?.nombre ?? null,
    patronResumen: resumenDe(p.patron),
    nombre: p.nombre,
    diasTrabajo: p.diasTrabajo,
    diasDescanso: p.diasDescanso,
    horaInicio: p.horaInicio,
    horaFin: p.horaFin,
    horario: etiquetaHorario(p.horaInicio, p.horaFin),
    horaInicioNoche: p.horaInicioNoche ?? null,
    horaFinNoche: p.horaFinNoche ?? null,
    horarioNoche: noche,
    jornada: p.jornada ?? "dia",
    horasSemanales: horas != null && Number.isFinite(horas) ? horas : null,
    colacionMin: p.colacionMin ?? 0,
    colacionFuera: p.colacionFuera ?? false,
    cobertura: p.cobertura ?? "ppc",
    coberturaMotivo: p.coberturaMotivo ?? null,
    dotacion: p.dotacion ?? 1,
    estado: p.estado ?? "activo",
    vigenteDesde: dia(p.vigenteDesde),
    vigenteHasta: dia(p.vigenteHasta),
    notas: p.notas ?? null,
  };
};

