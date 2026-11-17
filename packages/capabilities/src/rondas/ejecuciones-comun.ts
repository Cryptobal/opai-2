import { z } from "zod";

import { uuidSchema } from "../core/esquemas";

/** Estados visibles en historial e informes (rondas.md §6). */
const ESTADOS_EJECUCION = [
  "en_curso",
  "atrasada",
  "completada",
  "incompleta",
  "cerrada_auto",
  "cerrada_admin",
  "no_realizada",
] as const;
export type EstadoEjecucion = (typeof ESTADOS_EJECUCION)[number];
export const estadoEjecucionSchema = z.enum(ESTADOS_EJECUCION);

export const ejecucionResumenSchema = z.object({
  id: z.string(),
  instalacionId: uuidSchema,
  plantillaId: uuidSchema,
  plantillaNombre: z.string(),
  adhoc: z.boolean(),
  estado: estadoEjecucionSchema,
  horaInicio: z.string().nullable(),
  horaCierre: z.string().nullable(),
  puntosMarcados: z.number().int(),
  puntosObligatorios: z.number().int(),
  anomalias: z.number().int(),
});

const marcaDetalleSchema = z.object({
  id: uuidSchema,
  puntoId: uuidSchema,
  puntoNombre: z.string(),
  hora: z.string(),
  geocerca: z.string(),
  anomalias: z.array(z.string()),
});

export const ejecucionDetalleSchema = ejecucionResumenSchema.extend({
  marcas: z.array(marcaDetalleSchema),
  motivoCierre: z.string().nullable(),
});

type Cierre = { estado: string; horaCierre: Date; puntosMarcados: number; puntosObligatorios: number; motivo: string | null } | null;

/** Deriva el estado de pantalla a partir del cierre y los tiempos de la plantilla. */
export function derivarEstado(
  cierre: Cierre,
  horaInicio: Date,
  tiempoMaxMin: number,
  ahora: Date,
): EstadoEjecucion {
  if (cierre) {
    if (cierre.estado === "completada") return "completada";
    if (cierre.estado === "cerrada_auto") return "cerrada_auto";
    if (cierre.estado === "cerrada_admin") return "cerrada_admin";
    return "incompleta";
  }
  if (ahora.getTime() > horaInicio.getTime() + tiempoMaxMin * 60_000) return "atrasada";
  return "en_curso";
}

export function iso(d: Date): string {
  return d.toISOString();
}