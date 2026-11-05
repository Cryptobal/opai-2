import type { Contexto } from "@opai/capabilities";

import { aNumeroSeguro, type celdaSchema } from "../esquemas";
import { celdasCobrosEsperados } from "../cobros-esperados";
import type { z } from "zod";

const VINCULO_FILA = "finanzas:ventas";

/**
 * Celdas comprometidas DTE para una semana: los cobros esperados de las facturas por cobrar y los borradores, con el
 * mismo criterio de semana que la planilla (fecha esperada de cobro; ADR-073). Antes ubicaba la factura en su semana
 * de emisión y no restaba las notas de crédito parciales.
 */
export async function derivadasDteSemana(
  ctx: Contexto,
  semana: string,
): Promise<{ disponible: boolean; celdas: z.infer<typeof celdaSchema>[] }> {
  const fila = await ctx.db.flujoFila.findFirst({
    where: { seccion: "ingreso", activa: true, vinculo: VINCULO_FILA },
  });
  if (!fila) return { disponible: false, celdas: [] };
  const { vista } = await celdasCobrosEsperados(ctx, [semana]);
  return {
    disponible: true,
    celdas: vista.map((c) => ({ ...c, filaId: fila.id, monto: aNumeroSeguro(c.monto) })),
  };
}
