import { z } from "zod";

import { TIPOS_REPORTE_DT } from "../../domain/reportes";
import { fecha } from "../dias-capacidades";
import { uuid } from "../esquemas";

const MAX_DIAS_REPORTE = 93;

export const filtroReporte = z
  .object({
    tipo: z.enum(TIPOS_REPORTE_DT),
    desde: fecha,
    hasta: fecha,
    personaId: uuid.optional(),
    instalacionId: uuid.optional(),
  })
  .refine((i) => i.hasta >= i.desde, "«hasta» no puede ser anterior a «desde».")
  .refine(
    (i) => Date.parse(i.hasta) - Date.parse(i.desde) <= MAX_DIAS_REPORTE * 86_400_000,
    `Como máximo ${MAX_DIAS_REPORTE} días.`,
  );

export const cabeceraSchema = z.object({
  razonSocial: z.string(),
  rutEmpleador: z.string(),
  trabajador: z.string().nullable(),
  rutTrabajador: z.string().nullable(),
  lugar: z.string(),
  periodo: z.string(),
});

const filaSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

export const vistaReporteSchema = z.object({
  tipo: z.enum(TIPOS_REPORTE_DT),
  titulo: z.string(),
  cabecera: cabeceraSchema,
  columnas: z.array(z.object({ clave: z.string(), etiqueta: z.string() })),
  filas: z.array(filaSchema),
  siglasUsadas: z.array(z.string()),
  totalFilas: z.number().int(),
  provisorio: z.boolean(),
});

const dia = (f: string) => new Date(`${f}T00:00:00Z`);
export const rangoDias = (desde: string, hasta: string) => ({
  gte: dia(desde),
  lte: dia(hasta),
});