import { z } from "zod";

import { diaUtc, type FuenteDia } from "@opai/domain";

import { uuidSchema } from "../esquemas";

/** Fecha civil "aaaa-mm-dd" válida (sin hora ni zona): el feriado es por fecha, no por instante. */
export const fechaCivilSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato aaaa-mm-dd.")
  .refine((d) => {
    try {
      diaUtc(d);
      return true;
    } catch {
      return false;
    }
  }, "Fecha inexistente.");

export const nombreFeriadoSchema = z.string().trim().min(2).max(120);

/** Fila del calendario tal como la devuelven las capacidades. */
export const diaVistaSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  tipo: z.string(),
  nombre: z.string(),
  irrenunciable: z.boolean(),
  fuente: z.enum(["nacional", "regional", "tenant"]),
  region: z.string().nullable(),
  instalacionId: z.string().nullable(),
  /** true solo para las filas del tenant: las de plataforma no se editan. */
  editable: z.boolean(),
});
export type DiaVista = z.infer<typeof diaVistaSchema>;

export const uuidOpcional = uuidSchema.optional();

type FilaDia = {
  id: string;
  tenantId: string | null;
  fecha: Date;
  tipo: string;
  nombre: string;
  irrenunciable: boolean;
  region: string | null;
  instalacionId: string | null;
  fuente: string;
};

export const aIso = (d: Date): string => d.toISOString().slice(0, 10);

export function vista(r: FilaDia): DiaVista {
  return {
    id: r.id,
    fecha: aIso(r.fecha),
    tipo: r.tipo,
    nombre: r.nombre,
    irrenunciable: r.irrenunciable,
    fuente: r.fuente as FuenteDia,
    region: r.region,
    instalacionId: r.instalacionId,
    editable: r.tenantId !== null,
  };
}

/** Precedencia por fecha: tenant por instalación > tenant global > regional > nacional. */
export function precedencia(r: FilaDia): number {
  if (r.tenantId) return r.instalacionId ? 3 : 2;
  return r.region ? 1 : 0;
}
