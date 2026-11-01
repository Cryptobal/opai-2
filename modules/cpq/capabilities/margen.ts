import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { recalcularVersion } from "../persistencia/recalcular";
import { PERMISO_MANAGE, PERMISO_COSTOS } from "./permisos";
import { uuidSchema } from "./esquemas";

export const versionMargenActualizar = defineCapability({
  id: "cpq.versiones.margen",
  descripcion:
    "Cambia el modo y el objetivo de margen de una versión en borrador; requiere costos para ver el objetivo numérico.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    versionId: uuidSchema,
    margenModo: z.enum(["margen_sobre_venta", "markup", "margen_sobre_mano_de_obra"]).optional(),
    margenObjetivoPct: z.number().int().min(0).max(999_999).optional(),
  }),
  output: z.object({ ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.margenObjetivoPct !== undefined && !ctx.autorizar(PERMISO_COSTOS))
      throw noEncontrado("Margen objetivo");
    const version = await versionDeCotizacion(ctx, input.versionId);
    exigirBorrador(version);
    const data: Record<string, unknown> = {};
    if (input.margenModo) data["margenModo"] = input.margenModo;
    if (input.margenObjetivoPct !== undefined) data["margenObjetivoPct"] = input.margenObjetivoPct;
    if (dryRun) {
      const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, false);
      return { ventaMensualClp: r?.ventaMensual ?? null };
    }
    await ctx.db.cpqVersion.update({ where: { id: version.id }, data });
    await recalcularVersion(ctx, version.cotizacionId, version.numero, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { ventaMensualClp: v.ventaMensualClp };
  },
});

export const seccionMargenActualizar = defineCapability({
  id: "cpq.secciones.margen",
  descripcion: "Fija el margen propio de una sección (CR-COMB); solo borrador y permiso de costos.",
  permiso: PERMISO_MANAGE,
  input: z.object({ seccionId: uuidSchema, margenPct: z.number().int().min(0).max(999_999).nullable() }),
  output: z.object({ ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.autorizar(PERMISO_COSTOS)) throw noEncontrado("Margen de sección");
    const sec = await ctx.db.cpqSeccion.findFirst({ where: { id: input.seccionId } });
    if (!sec) throw noEncontrado("La sección");
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    if (dryRun) {
      const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, false);
      return { ventaMensualClp: r?.ventaMensual ?? null };
    }
    await ctx.db.cpqSeccion.update({ where: { id: sec.id }, data: { margenPct: input.margenPct } });
    await recalcularVersion(ctx, version.cotizacionId, version.numero, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { ventaMensualClp: v.ventaMensualClp };
  },
});
