import { z } from "zod";

import type { Contexto } from "@opai/capabilities";

import { montoDe } from "./esquemas";

export const loteRendicionSchema = z.object({
  loteId: z.string().uuid(),
  codigoVisible: z.string(),
  totalClp: z.number().int(),
  fechaPago: z.string().nullable(),
  referenciaPago: z.string().nullable(),
  confianza: z.number(),
  motivo: z.string(),
});

export type LoteRendicionSugerido = z.infer<typeof loteRendicionSchema>;

export async function lotesRendicionConciliables(
  ctx: Contexto,
  mov: { monto: unknown; fecha: Date; glosa: string },
): Promise<LoteRendicionSugerido[]> {
  const montoMov = montoDe(mov.monto);
  if (montoMov >= 0) return [];
  const absoluto = Math.abs(montoMov);
  const desdeL = new Date(mov.fecha);
  desdeL.setUTCDate(desdeL.getUTCDate() - 12);
  const hastaL = new Date(mov.fecha);
  hastaL.setUTCDate(hastaL.getUTCDate() + 5);
  const lotes = await ctx.db.lotePago.findMany({
    where: { estado: "pagado", totalClp: absoluto, fechaPago: { gte: desdeL, lte: hastaL } },
    orderBy: { codigo: "desc" },
    take: 3,
    select: { id: true, codigo: true, totalClp: true, fechaPago: true, referenciaPago: true },
  });
  return lotes.map((l) => ({
    loteId: l.id,
    codigoVisible: `LP-${l.codigo}`,
    totalClp: l.totalClp,
    fechaPago: l.fechaPago?.toISOString().slice(0, 10) ?? null,
    referenciaPago: l.referenciaPago,
    confianza: l.referenciaPago && mov.glosa.toLowerCase().includes(l.referenciaPago.toLowerCase()) ? 0.95 : 0.75,
    motivo: "Mismo monto y fecha cercana a un lote de rendiciones marcado pagado.",
  }));
}