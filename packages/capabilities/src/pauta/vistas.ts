import { z } from "zod";

export const celdaSchema = z.object({
  fecha: z.string(),
  estado: z.enum(["cubierto", "libre", "ppc", "sin_serie"]),
  motivo: z.enum(["sin_titular", "ausencia", "licencia", "vacaciones", "permiso"]).nullable(),
  excepcion: z.boolean(),
  feriado: z.string().nullable(),
  titularId: z.string().nullable(),
});

export const resumenSchema = z.object({
  programados: z.number().int(),
  cubiertos: z.number().int(),
  ppc: z.number().int(),
  /** Porcentaje con un decimal; null si no había turnos que cubrir. */
  cobertura: z.number().nullable(),
  ppcPorMotivo: z.record(z.string(), z.number().int()),
});

export const serieVistaSchema = z.object({
  id: z.string(),
  patronId: z.string(),
  patron: z.string(),
  inicioCiclo: z.string(),
  titularId: z.string().nullable(),
  titular: z.string().nullable(),
  desde: z.string(),
  hasta: z.string().nullable(),
});
export type SerieVista = z.infer<typeof serieVistaSchema>;

export const TIPOS_EXC = ["ausencia", "licencia", "vacaciones", "permiso"] as const;
export const tipoExcepcionSchema = z.enum(TIPOS_EXC);
