import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aprobacionSchema, vistaAprobaciones } from "./aprobaciones-vista";
import {
  aprobacionPlataformaVisible,
  auditarLecturaPlataforma,
  exigirVisiblePlataforma,
  veAprobacionesPlataforma,
  vistaAprobacionesPlataforma,
} from "./aprobaciones-plataforma";

export const aprobacionesList = defineCapability({
  // Los ids de la cola de plataforma no van a la cadena de la empresa: los audita la global.
  auditarLectura: (s) => s.filter((a) => a.ambito === "empresa").map((a) => a.id),
  id: "core.aprobaciones.list",
  descripcion:
    "Cola de aprobaciones de acciones irreversibles pedidas por agentes: pendientes primero, con resumen, agente y vencimiento; también el historial.",
  permiso: PERMISOS_CORE.aprobacionesManage,
  input: z.object({
    estado: z.enum(["pendiente", "aprobada", "rechazada", "vencida"]).optional(),
    limite: z.number().int().min(1).max(100).default(50),
    entidad: z
      .object({ tipo: z.enum(["cuenta", "instalacion", "persona"]), id: uuidSchema })
      .optional()
      .describe("Solo las que actúan sobre esta entidad (input.id o input.<tipo>Id)."),
  }),
  output: z.array(aprobacionSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (ctx.alcance) throw prohibido("No tienes acceso a estas aprobaciones.");
    const plataforma = veAprobacionesPlataforma(ctx);
    const filas = await ctx.db.aprobacion.findMany({
      where: {
        ...(input.estado ? { estado: input.estado } : {}),
        // Inmediato (CAR-36): las `platform.*` que quedaron en la empresa solo con platformRole.
        ...(plataforma ? {} : { NOT: { capability: { startsWith: "platform." } } }),
        ...(input.entidad
          ? {
              OR: [
                { input: { path: ["id"], equals: input.entidad.id } },
                { input: { path: [`${input.entidad.tipo}Id`], equals: input.entidad.id } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: input.limite,
    });
    // La cola de plataforma (fuera de los tenants) se suma solo para quien la ve; nunca actúa
    // sobre una entidad de la empresa, así que no aplica al filtro por entidad.
    const dePlataforma =
      plataforma && !input.entidad && ctx.plataforma
        ? await vistaAprobacionesPlataforma(
            ctx,
            await ctx.plataforma.globales.listarAprobacionesPlataforma({
              ...(input.estado ? { estado: input.estado } : {}),
              limite: input.limite,
            }),
          )
        : [];
    if (dePlataforma.length)
      await auditarLecturaPlataforma(ctx, "core.aprobaciones.list", dePlataforma);
    return [...(await vistaAprobaciones(ctx, filas)), ...dePlataforma]
      .sort((x, y) => y.creadaEn.localeCompare(x.creadaEn))
      .slice(0, input.limite);
  },
});

export const aprobacionesGet = defineCapability({
  auditarLectura: (s) => (s.ambito === "empresa" ? [s.id] : []),
  id: "core.aprobaciones.get",
  descripcion:
    "Una aprobación con su input completo, estado y, si se aprobó, el resultado de la ejecución. Los agentes la consultan para saber si su acción se hizo.",
  permiso: null,
  input: z.object({ id: uuidSchema }),
  output: aprobacionSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (ctx.alcance) throw noEncontrado("La aprobación");
    const a = await ctx.db.aprobacion.findUnique({ where: { id: input.id } });
    if (!a) {
      // Cola de plataforma (CAR-36): la key de plataforma consulta la suya; platformRole, todas.
      const p = await aprobacionPlataformaVisible(ctx, input.id);
      if (!p) throw noEncontrado("La aprobación");
      const [vista] = await vistaAprobacionesPlataforma(ctx, [p]);
      await auditarLecturaPlataforma(ctx, "core.aprobaciones.get", [p]);
      return vista as z.input<typeof aprobacionSchema>;
    }
    const propia =
      (ctx.agente && a.apiKeyId === ctx.agente.apiKeyId) ||
      (ctx.actor.tipo === "agent" &&
        ctx.actor.interno &&
        a.agenteInternoId === ctx.actor.id &&
        a.viaUserId === ctx.actor.viaUserId);
    if (!propia && !ctx.autorizar(PERMISOS_CORE.aprobacionesManage))
      throw noEncontrado("La aprobación");
    if (!propia) exigirVisiblePlataforma(ctx, a.capability);
    return (await vistaAprobaciones(ctx, [a]))[0] as z.input<typeof aprobacionSchema>;
  },
});
