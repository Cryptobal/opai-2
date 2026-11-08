import { z } from "zod";

import { TIPOS_CONTEXTO } from "@opai/domain";

export const contextoSchema = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_CONTEXTO),
  resumen: z.string(),
  fuente: z.string(),
  fechaFuente: z.string(),
  estado: z.enum(["confirmado", "inferido"]),
  creadoPorTipo: z.string(),
  confirmadoEn: z.string().nullable(),
});
type Fila = {
  id: string;
  tipo: string;
  resumen: string;
  fuente: string;
  fechaFuente: Date;
  estado: string;
  creadoPorTipo: string;
  confirmadoEn: Date | null;
};
export const vista = (f: Fila) => ({
  id: f.id,
  tipo: f.tipo as (typeof TIPOS_CONTEXTO)[number],
  resumen: f.resumen,
  fuente: f.fuente,
  fechaFuente: f.fechaFuente.toISOString().slice(0, 10),
  estado: f.estado as "confirmado" | "inferido",
  creadoPorTipo: f.creadoPorTipo,
  confirmadoEn: f.confirmadoEn?.toISOString() ?? null,
});
export const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD.");
