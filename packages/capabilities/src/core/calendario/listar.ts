import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aIso, diaVistaSchema, precedencia, vista } from "./comun";

/**
 * Calendario del año resuelto para el tenant: feriados nacionales y, si se indica una instalación,
 * los regionales de su región, más los días propios del tenant (globales o de esa instalación). Para
 * cada fecha gana la fila de mayor precedencia (tenant por instalación > tenant global > regional >
 * nacional): así un feriado del tenant sobrescribe al nacional solo en ese tenant.
 */
export const calendarioListar = defineCapability({
  id: "core.calendario.listar",
  descripcion:
    "Lista el calendario de feriados y días hábiles del año para la empresa, con los nacionales, los regionales de la instalación y los días propios del tenant.",
  permiso: PERMISOS_CORE.calendarioRead,
  input: z.object({
    anio: z.number().int().min(2000).max(2100),
    instalacionId: uuidSchema.optional(),
  }),
  output: z.array(diaVistaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    let region: string | null = null;
    if (input.instalacionId) {
      // El alcance se aplica en la consulta: la instalación es del tenant (RLS) o es "no encontrada".
      const inst = await ctx.db.instalacion.findUnique({
        where: { id: input.instalacionId },
        select: { id: true, region: true },
      });
      if (!inst) throw noEncontrado("La instalación");
      region = inst.region;
    }
    const desde = new Date(`${input.anio}-01-01T00:00:00.000Z`);
    const hasta = new Date(`${input.anio + 1}-01-01T00:00:00.000Z`);
    const filas = await ctx.db.diaCalendario.findMany({
      where: {
        archivadaEn: null,
        fecha: { gte: desde, lt: hasta },
        OR: [
          { tenantId: null, fuente: "nacional" },
          ...(region ? [{ tenantId: null, fuente: "regional", region }] : []),
          {
            tenantId: ctx.tenantId,
            ...(input.instalacionId
              ? { OR: [{ instalacionId: null }, { instalacionId: input.instalacionId }] }
              : { instalacionId: null }),
          },
        ],
      },
      orderBy: { fecha: "asc" },
    });
    const ganador = new Map<string, (typeof filas)[number]>();
    for (const f of filas) {
      const k = aIso(f.fecha);
      const prev = ganador.get(k);
      if (!prev || precedencia(f) > precedencia(prev)) ganador.set(k, f);
    }
    return [...ganador.values()].sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).map(vista);
  },
});
