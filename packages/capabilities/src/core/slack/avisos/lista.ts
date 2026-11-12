import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../../define";
import { iso } from "../../comun";

/** Avisos de terreno de las últimas 48 horas (CAR-294), para ver qué falta tomar o cerrar. */
export const avisosTerrenoList = defineCapability({
  id: "core.avisos_terreno.list",
  descripcion:
    "Lista los avisos de terreno de las últimas 48 horas (atrasos, ausencias, incidentes, pánico) con su estado en OPAI: abierto, tomado o cerrado. Un supervisor ve solo los de sus instalaciones.",
  permiso: PERMISOS_CORE.avisosTerrenoGestionar,
  // Lectura de avisos que nombran a personas (NÚCLEO-H): se auditan los ids revelados.
  auditarLectura: (s) => s.map((a) => a.id),
  input: z.object({ gestion: z.enum(["abierto", "tomado", "cerrado"]).optional() }),
  output: z.array(
    z.object({
      id: z.string(),
      tipo: z.string(),
      titulo: z.string(),
      gestion: z.string(),
      instalacionId: z.string().nullable(),
      creadoEn: z.string(),
      tomadoEn: z.string().nullable(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.slackAviso.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 48 * 3_600_000) },
        ...(input.gestion ? { gestion: input.gestion } : {}),
        // Alcance por filas en la consulta (ADR-022).
        ...(ctx.alcance ? { instalacionId: { in: [...ctx.alcance.instalaciones] } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return filas.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      gestion: a.gestion,
      instalacionId: a.instalacionId,
      creadoEn: iso(a.createdAt) ?? "",
      tomadoEn: iso(a.tomadoEn),
    }));
  },
});
