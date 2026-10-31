import { z } from "zod";

import { ESTADOS_NOVEDAD, ORIGENES_NOVEDAD } from "@opai/domain";

import { dia, tipoNovedadSchema } from "./comun";

export const novedadSchema = z.object({
  id: z.string(),
  periodoId: z.string(),
  personaId: z.string(),
  personaNombre: z.string(),
  tipo: tipoNovedadSchema,
  origen: z.enum(ORIGENES_NOVEDAD),
  estado: z.enum(ESTADOS_NOVEDAD),
  fechaDesde: z.string(),
  fechaHasta: z.string().nullable(),
  cantidad: z.number().nullable(),
  montoClp: z.number().int().nullable(),
  conceptoId: z.string().nullable(),
  prestamoCuotaId: z.string().nullable(),
  documentoId: z.string().nullable(),
  nota: z.string().nullable(),
  motivoAnulacion: z.string().nullable(),
});

type Fila = {
  id: string;
  periodoId: string;
  personaId: string;
  tipo: string;
  origen: string;
  estado: string;
  fechaDesde: Date;
  fechaHasta: Date | null;
  cantidad: { toString(): string } | number | null;
  montoClp: number | null;
  conceptoId: string | null;
  prestamoCuotaId?: string | null;
  documentoId: string | null;
  nota: string | null;
  motivoAnulacion?: string | null;
};

export type Nombres = ReadonlyMap<string, string>;

export function vistaNovedad(n: Fila, nombres: Nombres): z.output<typeof novedadSchema> {
  return {
    id: n.id,
    periodoId: n.periodoId,
    personaId: n.personaId,
    personaNombre: nombres.get(n.personaId) ?? "",
    tipo: n.tipo as z.output<typeof novedadSchema>["tipo"],
    origen: n.origen as z.output<typeof novedadSchema>["origen"],
    estado: n.estado as "vigente" | "anulada",
    fechaDesde: dia(n.fechaDesde) ?? "",
    fechaHasta: dia(n.fechaHasta),
    cantidad: n.cantidad == null ? null : Number(n.cantidad),
    montoClp: n.montoClp ?? null,
    conceptoId: n.conceptoId ?? null,
    prestamoCuotaId: n.prestamoCuotaId ?? null,
    documentoId: n.documentoId ?? null,
    nota: n.nota ?? null,
    motivoAnulacion: n.motivoAnulacion ?? null,
  };
}

/** Nombres de las personas indicadas («Apellidos, Nombres»), en una sola consulta. */
export async function nombresDe(
  db: { persona: { findMany(a: unknown): Promise<{ id: string; nombres: string; apellidos: string }[]> } },
  ids: readonly string[],
): Promise<Nombres> {
  if (ids.length === 0) return new Map();
  const personas = await db.persona.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, nombres: true, apellidos: true },
  });
  return new Map(personas.map((p) => [p.id, `${p.apellidos}, ${p.nombres}`]));
}
