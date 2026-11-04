import { signoDte, type TipoDteCompra } from "@opai/domain";

import { enScope } from "../../../autorizacion";
import type { Contexto } from "../../../types";
import { aFecha } from "../../maestros/comun";
import { cortesDelMes } from "./fechas";

export type Facturado = {
  periodo: string;
  /** Día del mes hasta el que se compara (inclusive). */
  hastaDia: number;
  netoClp: number;
  netoMesAnteriorClp: number;
};

/** Neto emitido del 1 al día de hoy y mismo tramo del mes anterior (sin borradores ni rechazados). */
export async function facturadoDelMes(ctx: Contexto, hoy: string): Promise<Facturado | null> {
  if (!enScope(ctx, "finanzas") || !ctx.modulosActivos.includes("finanzas")) return null;
  if (!ctx.autorizar("finanzas:read")) return null;
  const c = cortesDelMes(hoy);
  const neto = async (t: { desde: string; hastaExclusivo: string }) => {
    const porTipo = await ctx.db.documentoEmitido.groupBy({
      by: ["tipoDte"],
      where: {
        fechaEmision: { gte: aFecha(t.desde), lt: aFecha(t.hastaExclusivo) },
        estadoDte: { notIn: ["borrador", "rechazado"] },
      },
      _sum: { montoNeto: true },
    });
    return porTipo.reduce(
      (a, g) => a + signoDte(g.tipoDte as TipoDteCompra) * (g._sum.montoNeto ?? 0),
      0,
    );
  };
  const [netoClp, netoMesAnteriorClp] = await Promise.all([neto(c.actual), neto(c.anterior)]);
  return { periodo: c.periodo, hastaDia: c.dia, netoClp, netoMesAnteriorClp };
}
