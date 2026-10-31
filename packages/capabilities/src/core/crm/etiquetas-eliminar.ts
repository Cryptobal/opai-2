import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { etiquetaDe } from "./etiquetas";

export const etiquetasDelete = defineCapability({
  id: "core.etiquetas.delete",
  descripcion:
    "Elimina una etiqueta del catálogo y la quita de todo lo que la tenía. Un agente necesita aprobación humana; para dejar de usarla sin perder el historial, desactívala.",
  permiso: PERMISOS_CORE.etiquetasConfig,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: z.string(), asignacionesQuitadas: z.number() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const e = await etiquetaDe(ctx, input.id);
    const asignacionesQuitadas = await ctx.db.etiquetaAsignacion.count({
      where: { etiquetaId: e.id },
    });
    if (dryRun) return { id: e.id, asignacionesQuitadas };
    await ctx.transaccion(async (tx) => {
      await tx.etiquetaAsignacion.deleteMany({ where: { etiquetaId: e.id } });
      await tx.etiqueta.delete({ where: { id: e.id } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.etiqueta.eliminada",
        entidadTipo: "etiqueta",
        entidadId: e.id,
        payload: { asignacionesQuitadas },
      });
    });
    return { id: e.id, asignacionesQuitadas };
  },
});
