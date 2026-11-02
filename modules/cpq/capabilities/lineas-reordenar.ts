import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { PERMISO_MANAGE } from "./permisos";
import { seccionDe } from "./lineas-util";
import { uuidSchema } from "./esquemas";

export const lineasReordenar = defineCapability({
  id: "cpq.lineas.reordenar",
  descripcion: "Reordena las líneas dentro de una sección.",
  permiso: PERMISO_MANAGE,
  input: z.object({ seccionId: uuidSchema, ids: z.array(uuidSchema).min(1).max(200) }),
  output: z.object({ ok: z.literal(true) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const sec = await seccionDe(ctx, input.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const lineas = await ctx.db.cpqLinea.findMany({ where: { seccionId: sec.id } });
    if (input.ids.length !== lineas.length) throw reglaDeNegocio("Faltan líneas en el reorden.");
    if (dryRun) return { ok: true as const };
    await ctx.transaccion(async (tx) => {
      for (let i = 0; i < input.ids.length; i++)
        await tx.cpqLinea.update({ where: { id: input.ids[i]! }, data: { orden: i } });
    });
    return { ok: true as const };
  },
});
