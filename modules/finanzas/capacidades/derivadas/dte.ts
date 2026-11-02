import type { Contexto } from "@opai/capabilities";
import { celdasDerivadasDte, documentoPorCobrar, type DocumentoDerivadaDte } from "@opai/domain";

import { aNumeroSeguro, type celdaSchema } from "../esquemas";
import type { z } from "zod";

const VINCULO_FILA = "finanzas:ventas";

/** Celdas comprometidas DTE para una semana (emisión impaga sin arrastre + borradores). */
export async function derivadasDteSemana(
  ctx: Contexto,
  semana: string,
): Promise<{ disponible: boolean; celdas: z.infer<typeof celdaSchema>[] }> {
  const fila = await ctx.db.flujoFila.findFirst({
    where: { seccion: "ingreso", activa: true, vinculo: VINCULO_FILA },
  });
  if (!fila) {
    return { disponible: false, celdas: [] };
  }
  const docs = await ctx.db.documentoEmitido.findMany({
    where: {
      OR: [
        { estadoDte: "borrador", cesionEstado: { not: "cedido" } },
        {
          estadoDte: { in: ["enviado", "aceptado"] },
          estadoCobro: { notIn: ["pagada", "cedida"] },
          cesionEstado: { not: "cedido" },
        },
      ],
    },
    select: {
      id: true,
      tipoDte: true,
      folio: true,
      fechaEmision: true,
      fechaVencimiento: true,
      montoTotal: true,
      montoCobrado: true,
      estadoDte: true,
      estadoCobro: true,
      cesionEstado: true,
      glosa: true,
    },
  });
  const entrada: DocumentoDerivadaDte[] = docs
    .filter((d) =>
      documentoPorCobrar({
        estadoCobro: d.estadoCobro,
        cesionEstado: d.cesionEstado,
        montoTotal: d.montoTotal,
        montoCobrado: d.montoCobrado,
      }) || d.estadoDte === "borrador",
    )
    .map((d) => ({
      id: d.id,
      tipoDte: d.tipoDte,
      folio: d.folio,
      fechaEmision: d.fechaEmision?.toISOString().slice(0, 10) ?? null,
      fechaVencimiento: d.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
      montoTotal: d.montoTotal,
      montoCobrado: d.montoCobrado,
      estadoDte: d.estadoDte,
      estadoCobro: d.estadoCobro,
      cesionEstado: d.cesionEstado,
      glosa: d.glosa,
    }));
  const derivadas = celdasDerivadasDte(entrada, semana);
  return {
    disponible: true,
    celdas: derivadas.map((c) => ({
      id: c.documentoId,
      filaId: fila.id,
      semana: c.semana,
      capa: c.capa,
      monto: aNumeroSeguro(c.monto),
      nota: c.etiqueta,
    })),
  };
}
