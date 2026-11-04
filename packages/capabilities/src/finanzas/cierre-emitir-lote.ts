// Emisión en lote del cierre de mes: una aprobación humana, N emisiones (BRIEF-33 · CAR-167).
// Todo o nada: si una emisión falla, ninguna queda hecha (una sola transacción, sin parciales).
import { z } from "zod";

import { emitibleEnLote, etapaCierre, NOMBRE_ETAPA } from "@opai/domain";
import { defineCapability } from "../define";
import { ErrorCapacidad, reglaDeNegocio } from "../errores";
import { PERMISO_VENTAS } from "./ventas-comun";
import { aSeguimiento } from "./cierre-esquemas";
import { emitirBorrador } from "./ventas-emision";

export const MAX_LOTE_CIERRE = 50;

const resultadoSchema = z.object({
  documentoId: z.string(),
  estado: z.enum(["emitido", "emitible", "omitido"]),
  motivo: z.string().nullable(),
  folio: z.number().int().nullable(),
});

export const cierreEmitirLote = defineCapability({
  id: "finanzas.cierre.emitir_lote",
  descripcion:
    "Emite en lote los borradores del cierre de mes que ya tienen el OK del cliente: asigna folio y firma cada uno. Una sola aprobación humana cubre todo el lote. Los que no están listos o ya fueron emitidos se omiten; si una emisión falla, no se emite ninguna.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoIds: z.array(z.string().uuid()).min(1).max(MAX_LOTE_CIERRE) }),
  output: z.object({
    emitidos: z.number().int(),
    omitidos: z.number().int(),
    resultados: z.array(resultadoSchema),
  }),
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const ids = [...new Set(input.documentoIds)];
    const docs = await ctx.db.documentoEmitido.findMany({
      where: { id: { in: ids } },
      select: { id: true, estadoDte: true, folio: true, seguimientoCierre: true },
    });
    const porId = new Map(docs.map((d) => [d.id, d]));
    const resultados: z.infer<typeof resultadoSchema>[] = [];
    for (const id of ids) {
      const d = porId.get(id);
      if (!d) {
        resultados.push({ documentoId: id, estado: "omitido", motivo: "El documento no existe.", folio: null });
        continue;
      }
      const seg = aSeguimiento(d.seguimientoCierre);
      if (!emitibleEnLote(d.estadoDte, seg)) {
        const etapa = etapaCierre(d.estadoDte, seg);
        resultados.push({
          documentoId: id,
          estado: "omitido",
          motivo: etapa === "emitido" ? "Ya está emitido." : `Aún no está listo: ${NOMBRE_ETAPA[etapa].toLowerCase()}.`,
          folio: d.folio,
        });
        continue;
      }
      try {
        const v = await emitirBorrador(ctx, id, dryRun);
        resultados.push({ documentoId: id, estado: dryRun ? "emitible" : "emitido", motivo: null, folio: v.folio ?? null });
      } catch (e) {
        if (!(e instanceof ErrorCapacidad)) throw e;
        if (!dryRun) throw reglaDeNegocio(`No se emitió ningún documento del lote: ${e.message}`, e.detalles);
        resultados.push({ documentoId: id, estado: "omitido", motivo: e.message, folio: null });
      }
    }
    return {
      emitidos: resultados.filter((r) => r.estado === "emitido" || r.estado === "emitible").length,
      omitidos: resultados.filter((r) => r.estado === "omitido").length,
      resultados,
    };
  },
});
