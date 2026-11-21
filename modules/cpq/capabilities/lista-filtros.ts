import { z } from "zod";

import { estadoSchema, listaSchema, uuidSchema } from "./esquemas";

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const inputListaCotizacionesSchema = listaSchema.extend({
  negocioId: uuidSchema.optional(),
  estado: estadoSchema.optional(),
  cuentaId: uuidSchema.optional(),
  responsableId: uuidSchema.optional(),
  enviadaDesde: fechaIso.optional(),
  enviadaHasta: fechaIso.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  incluirArchivadas: z.boolean().default(false),
  soloArchivadas: z.boolean().default(false),
});

export type InputListaCotizaciones = z.infer<typeof inputListaCotizacionesSchema>;

/** Arma el `where` de Prisma para `cpq.cotizaciones.list` (filtros de la lista CAR-544). */
export function whereListaCotizaciones(input: InputListaCotizaciones): Record<string, unknown> {
  const filtro: Record<string, unknown> = {};
  if (input.negocioId) filtro.negocioId = input.negocioId;
  const versionSome: Record<string, unknown> = {};
  if (input.estado) versionSome.estado = input.estado;
  if (input.enviadaDesde || input.enviadaHasta) {
    versionSome.enviadaEn = {
      not: null,
      ...(input.enviadaDesde ? { gte: new Date(`${input.enviadaDesde}T00:00:00.000Z`) } : {}),
      ...(input.enviadaHasta ? { lte: new Date(`${input.enviadaHasta}T23:59:59.999Z`) } : {}),
    };
  }
  if (Object.keys(versionSome).length > 0) {
    filtro.versiones = { some: versionSome };
  } else if (!input.incluirArchivadas && !input.soloArchivadas) {
    filtro.versiones = { none: { estado: "archivada" } };
  }
  if (input.soloArchivadas) filtro.archivadaEn = { not: null };
  else if (!input.incluirArchivadas) filtro.archivadaEn = null;
  const q = input.q?.trim();
  if (q) {
    filtro.OR = [
      { codigo: { contains: q, mode: "insensitive" } },
      { titulo: { contains: q, mode: "insensitive" } },
    ];
  }
  return filtro;
}