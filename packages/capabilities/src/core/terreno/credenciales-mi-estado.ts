import { z } from "zod";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import { quien } from "./comun";

/** Estado del PIN de la propia persona (sin revelar el PIN). */
export const credencialesTerrenoMiEstado = defineCapability({
  id: "core.credenciales_terreno.mi_estado",
  descripcion:
    "Indica si la persona autenticada ya tiene PIN de terreno y si debe cambiarlo tras uno temporal.",
  soloPersonas: true,
  permiso: null,
  portales: ["trabajador", "terreno"],
  input: z.object({}),
  output: z.object({ tienePin: z.boolean(), debeCambiar: z.boolean() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const userId = quien(ctx);
    if (!userId) throw prohibido("Solo la propia persona puede consultar su PIN.");
    const personaId =
      ctx.verComo?.personaId ??
      (
        await ctx.db.persona.findFirst({
          where: { usuarioId: userId, archivadaEn: null, anonimizadaEn: null },
          select: { id: true },
        })
      )?.id;
    const c = personaId
      ? await ctx.db.credencialTerreno.findUnique({ where: { personaId } })
      : null;
    return { tienePin: !!c, debeCambiar: c?.debeCambiar ?? false };
  },
});