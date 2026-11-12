// UF con que se valorizó el período de una proforma o estado de pago (CAR-320, pendiente de #555).
// Sale de la corrida que generó el borrador: es la UF que dio los montos del documento, no la de hoy.
import { fechaUfDe, ufCentavosATexto } from "@opai/domain";

import type { Contexto } from "../types";
import { ufCentavosDelDia } from "./ventas-programacion-uf";

export type UfPrevio = { valor: string; fecha: string; estimada: boolean };

/**
 * `null` si el borrador no viene de una corrida o la programación no es en UF. «Estimada» mientras el SII no publique
 * la UF del día que fija la política de la programación, o si la publicada no es la que se usó.
 */
export async function ufDelPrevio(ctx: Contexto, documentoId: string, fechaFactura: string): Promise<UfPrevio | null> {
  const c = await ctx.db.ventasProgramacionCorrida.findFirst({
    where: { documentoId },
    select: { ufCentavos: true, fechaGeneracion: true, programacion: { select: { politicaUf: true, diaUf: true } } },
  });
  if (!c || c.ufCentavos === null) return null;
  const fecha = fechaUfDe(c.programacion.politicaUf, c.programacion.diaUf, c.fechaGeneracion?.toISOString().slice(0, 10) ?? fechaFactura);
  const oficial = await ufCentavosDelDia(ctx.db, fecha);
  return { valor: ufCentavosATexto(c.ufCentavos), fecha, estimada: oficial === null || oficial !== c.ufCentavos };
}
