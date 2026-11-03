import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { recalcularVersion } from "../persistencia/recalcular";
import { cotizacionDe } from "./util";
import { PERMISO_MANAGE } from "./permisos";
import { seccionDe } from "./lineas-util";
import { uuidSchema } from "./esquemas";

export const lineasQuitar = defineCapability({
  id: "cpq.lineas.quitar",
  descripcion: "Quita una línea de la cotización en borrador y recalcula la venta mensual en el servidor.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: z.object({ ok: z.literal(true), ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.cpqLinea.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("La línea");
    const sec = await seccionDe(ctx, actual.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const cot = await cotizacionDe(ctx, version.cotizacionId);
    if (dryRun) {
      const r = await recalcularVersion(ctx, cot.id, undefined, false, {
        lineas: (ls) => ls.filter((l) => l.id !== input.id),
      });
      return { ok: true as const, ventaMensualClp: r?.ventaMensual ?? null };
    }
    await ctx.db.cpqLinea.delete({ where: { id: input.id } });
    await recalcularVersion(ctx, cot.id, undefined, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { ok: true as const, ventaMensualClp: v.ventaMensualClp };
  },
});
