import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { descartarMovimientos } from "./descartes-crear";
import { aFecha, aIso } from "./util";
import { montoDe } from "./esquemas";

export const sobranteSchema = z.object({ id: z.uuid(), fecha: z.string(), monto: z.number().int(), glosa: z.string() });
type Sobrante = z.infer<typeof sobranteSchema>;

/** Período que cubre la cartola: el de su cabecera o, si no lo trae, el de sus filas. */
export type Periodo = { desde: string; hasta: string };

const enLineaSinConciliar = (cuentaId: string, p: Periodo) => ({
  cuentaId,
  origen: "web4leads",
  fecha: { gte: aFecha(p.desde), lte: aFecha(p.hasta) },
  conciliaciones: { none: { activa: true, confirmada: true } },
});

/**
 * CAR-450: movimientos del banco en línea dentro del período de una cartola que cuadra y que la cartola no trae (no
 * emparejaron). Si la cartola cuadra, contarlos además duplica el período: la cartola manda, como en Xero cuando el
 * extracto reemplaza al feed. Los conciliados se conservan. Solo lectura.
 */
export async function sobrantesEnLinea(ctx: Contexto, cuentaId: string, p: Periodo, emparejados: Set<string>): Promise<Sobrante[]> {
  const movs = await ctx.db.movimientoBancario.findMany({
    where: enLineaSinConciliar(cuentaId, p),
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    select: { id: true, fecha: true, monto: true, glosa: true },
  });
  return movs.filter((m) => !emparejados.has(m.id)).map((m) => ({ id: m.id, fecha: aIso(m.fecha), monto: montoDe(m.monto), glosa: m.glosa }));
}

/**
 * Quita los sobrantes como un descarte restaurable (CAR-412). Se vuelven a leer en la transacción: lo que se concilió
 * o ya no está desde la vista previa se conserva. Devuelve cuántos se quitaron.
 */
export async function quitarSobrantes(ctx: Contexto, tx: TenantTx, p: { cuentaId: string; periodo: Periodo; ids: string[]; archivo: string | null }) {
  if (!p.ids.length) return 0;
  const movs = await tx.movimientoBancario.findMany({ where: { ...enLineaSinConciliar(p.cuentaId, p.periodo), id: { in: p.ids } } });
  if (!movs.length) return 0;
  const motivo = `Sobrantes del banco en línea frente a la cartola ${p.archivo ?? "importada"}.`;
  await descartarMovimientos(ctx, tx, { cuentaId: p.cuentaId, ...p.periodo, origen: "web4leads", motivo, movimientos: movs });
  return movs.length;
}
