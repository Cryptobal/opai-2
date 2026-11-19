import { z } from "zod";

import { TIPOS_JORNADA } from "../domain";

export const ESTADOS_HOY = ["presente", "sin_marca", "ausente", "sin_turno", "incompleto"] as const;

export const itemSchema = z.object({
  personaId: z.string(),
  nombre: z.string(),
  instalacionId: z.string().nullable(),
  instalacion: z.string().nullable(),
  turnoInicio: z.string().nullable(),
  turnoFin: z.string().nullable(),
  entrada: z.string().nullable(),
  salida: z.string().nullable(),
  estado: z.enum(ESTADOS_HOY),
  sigla: z.string().nullable(),
  atrasoMin: z.number().int(),
  tipoJornada: z.enum(TIPOS_JORNADA),
  correccionPendiente: z.boolean(),
  descansoInsuficiente: z.boolean(),
  marcaFueraDeTurno: z.boolean(),
});