import { z } from "zod";

import { defineCapability, prohibido } from "@opai/capabilities";

import { estadoSchema, rendicionSchema, resumenSchema, uuidSchema } from "./esquemas";
import { PERMISO_APROBAR, PERMISO_RENDIR, PERMISO_VER_TODAS } from "./permisos";
import { actorId, rendicionDe, resumenDe, vistaDe } from "./util";

export const rendicionesListar = defineCapability({
  id: "rendiciones.rendiciones.listar",
  descripcion:
    "Lista rendiciones según el alcance pedido: «propias» (las que rindió quien consulta), «por_aprobar» (enviadas y asignadas a quien consulta) o «todas» (solo con permiso de ver todas). Filtra por estado.",
  permiso: PERMISO_RENDIR,
  input: z.object({
    alcance: z.enum(["propias", "por_aprobar", "todas"]).default("propias"),
    estado: estadoSchema.optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ rendiciones: z.array(resumenSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.rendiciones.map((r) => r.id),
  async handler(ctx, input) {
    const yo = actorId(ctx);
    if (input.alcance === "todas" && !ctx.autorizar(PERMISO_VER_TODAS)) throw prohibido("No puedes ver las rendiciones de toda la empresa.");
    if (input.alcance === "por_aprobar" && !ctx.autorizar(PERMISO_APROBAR)) throw prohibido("No tienes permiso para aprobar rendiciones.");
    const donde =
      input.alcance === "propias" ? { solicitanteId: yo }
      : input.alcance === "por_aprobar" ? { aprobadorId: yo, estado: "enviada" }
      : {};
    const filas = await ctx.db.rendicion.findMany({
      where: { ...donde, ...(input.estado ? { estado: input.estado } : {}) },
      orderBy: { codigo: "desc" },
      take: input.limite,
    });
    return { rendiciones: filas.map(resumenDe) };
  },
});

export const rendicionesObtener = defineCapability({
  id: "rendiciones.rendiciones.obtener",
  descripcion:
    "Devuelve una rendición con todos sus gastos. La ve quien la rindió, el aprobador asignado o quien puede ver todas las de la empresa; para el resto no existe.",
  permiso: PERMISO_RENDIR,
  input: z.object({ id: uuidSchema }),
  output: z.object({ rendicion: rendicionSchema }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.rendicion.id],
  async handler(ctx, input) {
    actorId(ctx);
    return { rendicion: vistaDe(await rendicionDe(ctx, input.id)) };
  },
});
