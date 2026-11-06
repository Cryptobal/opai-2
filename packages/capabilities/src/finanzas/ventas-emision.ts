import { z } from "zod";

import { adaptadorSiiDe } from "./adaptador-sii";

import { defineCapability } from "../define";
import { aFecha, escribirConEvento } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { vistaDeDocumento } from "./ventas-consulta";
import { PERMISO_VENTAS, consumirFolio, documentoEmitidoIdSchema, marcarBorradorEmitido } from "./ventas-comun";
import { cargarBorradorEmitible, prepararEmision, type EmisionPreparada } from "./ventas-emision-preparar";
import { ventaSchema } from "./vistas-venta";
import type { Contexto } from "../types";

const preparadaSchema = z.object({
  documentoId: z.string(),
  folio: z.number().int(),
  fechaEmision: z.string(),
  timbrePdf417: z.string(),
});

export const leerEmisionPreparada = (preparado: unknown): EmisionPreparada | null => {
  const r = preparadaSchema.safeParse(preparado);
  return r.success ? r.data : null;
};

/**
 * Emite un borrador (también lo usa el cierre de mes, que emite en lote). En la ejecución real el DTE llega ya
 * firmado (`prepararEmision`, fuera de la transacción): aquí solo se reclama el folio, se marca emitido y se
 * emite el evento, todo atómico y sin llamadas remotas.
 */
export async function emitirBorrador(
  ctx: Contexto,
  documentoId: string,
  dryRun: boolean,
  preparada?: EmisionPreparada | null,
) {
  const { doc, cuenta, tipo } = await cargarBorradorEmitible(ctx, documentoId);
  const adaptador = await adaptadorSiiDe(ctx);
  if (!adaptador.disponible) throw reglaDeNegocio("El adaptador SII no está disponible.");
  if (dryRun) {
    const folio = await consumirFolio(ctx, tipo, true);
    const { vistaVenta } = await import("./vistas-venta");
    return vistaVenta({ ...doc, folio, estadoDte: "enviado" }, cuenta, doc.lineas.map((l) => ({
      id: l.id,
      orden: l.orden,
      glosa: l.glosa,
      monto: l.monto,
    })));
  }
  if (!preparada || preparada.documentoId !== doc.id) {
    throw reglaDeNegocio("El documento no llegó firmado a la emisión; reintente.");
  }
  await escribirConEvento(
    ctx,
    {
      tipo: "finanzas.venta.emitida",
      entidadTipo: "documento_emitido",
      payload: () => ({ folio: preparada.folio, tipoDte: doc.tipoDte }),
    },
    async (tx) => {
      const folio = await consumirFolio(ctx, tipo, false, tx);
      if (folio !== preparada.folio) {
        throw reglaDeNegocio("El folio cambió mientras se firmaba el documento; reintente la emisión.");
      }
      await marcarBorradorEmitido(tx, doc.id, {
        folio,
        fechaEmision: aFecha(preparada.fechaEmision),
        timbrePdf417: preparada.timbrePdf417,
      });
      return { id: doc.id };
    },
  );
  return vistaDeDocumento(ctx, doc.id);
}

export const ventasEmitir = defineCapability({
  id: "finanzas.ventas.emitir",
  descripcion:
    "Emite un borrador: asigna folio, firma el XML con el adaptador SII del entorno y deja el documento en estado enviado listo para el SII. Requiere folios CAF y RUT emisor configurados.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: documentoEmitidoIdSchema }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  // La firma (llamada remota) va antes de la transacción de la escritura.
  preparar: (ctx, input) => prepararEmision(ctx, input.documentoId),
  async handler(ctx, input, { dryRun, preparado }) {
    return emitirBorrador(ctx, input.documentoId, dryRun, leerEmisionPreparada(preparado));
  },
});
