import { z } from "zod";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import { uuidSchema } from "../esquemas";
import { PERMISO_MANAGE, actividadDe } from "./actividades-comun";

export const actividadesDelete = defineCapability({
  id: "core.actividades.delete",
  descripcion:
    "Elimina una actividad (nota, llamada, reunión o tarea) y sus vínculos. Solo quien la creó, un owner o un admin; un agente necesita aprobación humana.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: z.string() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const a = await actividadDe(ctx, input.id);
    const esCreador = !!ctx.usuario && a.creadaPorId === ctx.usuario.id;
    if (!esCreador && ctx.rol !== "owner" && ctx.rol !== "admin")
      throw prohibido("Solo quien la creó, un owner o un admin puede eliminar la actividad.");
    if (dryRun) return { id: a.id };
    await ctx.transaccion(async (tx) => {
      await tx.actividad.delete({ where: { id: a.id } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.actividad.eliminada",
        entidadTipo: "actividad",
        entidadId: a.id,
        payload: { tipo: a.tipo },
      });
    });
    return { id: a.id };
  },
});
