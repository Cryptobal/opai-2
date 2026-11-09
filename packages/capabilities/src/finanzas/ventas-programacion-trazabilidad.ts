// Trazabilidad de cada período de una programación: borrador → proforma / estado de pago → factura → caja
// (CAR-221). Solo lee; el alcance es el del tenant de la sesión.
import { z } from "zod";

import type { Contexto } from "../types";

export const trazaSchema = z.object({
  fechaFactura: z.string().nullable().describe("Fecha proyectada de la factura (la del borrador hasta que se emite)."),
  estadoDte: z.string().nullable().describe("borrador | enviado | aceptado | rechazado | anulado_nc"),
  folio: z.number().int().nullable(),
  proformaEnviadaEn: z.string().nullable(),
  proformaEstado: z.string().nullable().describe("Estado del cierre: pendiente | enviada | observada | ok."),
  previos: z
    .array(z.object({ tipo: z.enum(["proforma", "estado_pago"]), estado: z.string() }))
    .describe("Proforma y estado de pago enviados desde la programación (el último intento de cada uno)."),
  estadoCobro: z.string().nullable().describe("pendiente | pagada_parcial | pagada | cedida; solo con factura emitida."),
  montoCobrado: z.number().int().nullable(),
  cobroEsperadoEn: z.string().nullable().describe("Fecha esperada del cobro en el flujo de caja."),
});
export type Traza = z.infer<typeof trazaSchema>;

const dia = (d: Date | null | undefined) => d?.toISOString().slice(0, 10) ?? null;
const TIPOS = new Set(["proforma", "estado_pago"]);

/** Traza por documentoId de los borradores generados. */
export async function trazasDe(ctx: Contexto, documentoIds: string[]): Promise<Map<string, Traza>> {
  const salida = new Map<string, Traza>();
  if (!documentoIds.length) return salida;
  const docs = await ctx.db.documentoEmitido.findMany({
    where: { id: { in: documentoIds } },
    select: {
      id: true,
      estadoDte: true,
      folio: true,
      fechaEmision: true,
      estadoCobro: true,
      montoCobrado: true,
      seguimientoCierre: { select: { estado: true, enviadaEn: true } },
      cobroEsperado: { select: { fecha: true } },
      enviosCliente: { orderBy: { createdAt: "asc" }, select: { adjuntos: true, estado: true } },
    },
  });
  for (const d of docs) {
    const ultimos = new Map<string, string>();
    for (const e of d.enviosCliente) {
      const tipo = e.adjuntos.find((a) => TIPOS.has(a));
      if (tipo) ultimos.set(tipo, e.estado);
    }
    const emitido = d.folio !== null;
    salida.set(d.id, {
      fechaFactura: dia(d.fechaEmision),
      estadoDte: d.estadoDte,
      folio: d.folio,
      proformaEnviadaEn: d.seguimientoCierre?.enviadaEn?.toISOString() ?? null,
      proformaEstado: d.seguimientoCierre?.estado ?? null,
      previos: [...ultimos].map(([tipo, estado]) => ({ tipo: tipo as "proforma" | "estado_pago", estado })),
      estadoCobro: emitido ? d.estadoCobro : null,
      montoCobrado: emitido ? d.montoCobrado : null,
      cobroEsperadoEn: dia(d.cobroEsperado?.fecha),
    });
  }
  return salida;
}
