import type { Contexto } from "@opai/capabilities";
import { emparejarMovimientos } from "@opai/domain";

import { TOLERANCIA_DIAS } from "./cartola-emparejar";
import { aFecha, aIso } from "./util";

type Entrante = { idExterno: string; fecha: string; monto: number; glosa: string; referencia: string | null };

/** Un movimiento del banco en línea que ya estaba por cartola o registro manual: se le asigna su id externo. */
export type VinculoExterno = { existenteId: string; idExterno: string };

const sumarDias = (iso: string, n: number) => aIso(new Date(aFecha(iso).getTime() + n * 86_400_000));

/**
 * CAR-341: lo que el banco en línea entrega y ya está guardado por una cartola o a mano (sin id externo), aunque con
 * otra fecha (±3 días) o glosa rotulada distinto, es el mismo movimiento: no se inserta y el existente queda con su
 * id externo para que las próximas entregas lo reconozcan. La fecha de la cartola se conserva. Solo lectura.
 */
export async function yaGuardadosPorCartola(ctx: Contexto, cuentaId: string, entrantes: Entrante[]): Promise<Map<number, VinculoExterno>> {
  const out = new Map<number, VinculoExterno>();
  if (!entrantes.length) return out;
  const fechas = entrantes.map((e) => e.fecha).sort();
  const guardados = await ctx.db.movimientoBancario.findMany({
    where: {
      cuentaId,
      idExterno: null,
      fecha: { gte: aFecha(sumarDias(fechas[0]!, -TOLERANCIA_DIAS)), lte: aFecha(sumarDias(fechas.at(-1)!, TOLERANCIA_DIAS)) },
    },
    select: { id: true, fecha: true, monto: true, glosa: true, referencia: true },
  });
  const existentes = guardados.map((g) => ({ id: g.id, fecha: aIso(g.fecha), monto: Number(g.monto), glosa: g.glosa, referencia: g.referencia }));
  for (const [i, par] of emparejarMovimientos(entrantes, existentes, { toleranciaDias: TOLERANCIA_DIAS })) {
    out.set(i, { existenteId: par.existenteId, idExterno: entrantes[i]!.idExterno });
  }
  return out;
}
