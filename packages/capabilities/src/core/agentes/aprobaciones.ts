import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { iso } from "../comun";
import { uuidSchema } from "../esquemas";

const aprobacionSchema = z.object({
  id: z.string(),
  apiKeyId: z.string(),
  agente: z.string(),
  capability: z.string(),
  resumen: z.string(),
  input: z.unknown(),
  estado: z.enum(["pendiente", "aprobada", "rechazada", "vencida"]),
  venceEn: z.string(),
  resueltaPor: z.string().nullable(),
  resueltaEn: z.string().nullable(),
  motivo: z.string().nullable(),
  resultado: z.unknown(),
  creadaEn: z.string(),
});

type Fila = Awaited<ReturnType<Contexto["db"]["aprobacion"]["findFirstOrThrow"]>>;

async function vista(ctx: Contexto, filas: Fila[]) {
  const keys = await ctx.db.apiKey.findMany({
    where: { id: { in: [...new Set(filas.map((f) => f.apiKeyId))] } },
    select: { id: true, nombre: true },
  });
  const nombre = new Map(keys.map((k) => [k.id, k.nombre]));
  return filas.map((a) => ({
    id: a.id,
    apiKeyId: a.apiKeyId,
    agente: nombre.get(a.apiKeyId) ?? "Key eliminada",
    capability: a.capability,
    resumen: a.resumen,
    input: a.input,
    estado: a.estado as "pendiente",
    venceEn: a.venceEn.toISOString(),
    resueltaPor: a.resueltaPor ?? null,
    resueltaEn: iso(a.resueltaEn),
    motivo: a.motivo ?? null,
    resultado: a.resultado ?? null,
    creadaEn: a.createdAt.toISOString(),
  }));
}

export async function pendiente(ctx: Contexto, id: string) {
  const a = await ctx.db.aprobacion.findUnique({ where: { id } });
  if (!a) throw noEncontrado("La aprobación");
  if (a.estado !== "pendiente") throw conflicto(`La aprobación ya está ${a.estado}.`);
  if (a.venceEn.getTime() <= Date.now())
    throw reglaDeNegocio("La aprobación venció; el agente debe pedirla de nuevo.");
  if (ctx.actor.tipo !== "user")
    throw prohibido("Solo una persona puede resolver una aprobación (no una API key).");
  return a;
}

export const aprobacionesList = defineCapability({
  id: "core.aprobaciones.list",
  descripcion:
    "Cola de aprobaciones de acciones irreversibles pedidas por agentes: pendientes primero, con resumen, agente y vencimiento; también el historial.",
  permiso: PERMISOS_CORE.aprobacionesManage,
  input: z.object({
    estado: z.enum(["pendiente", "aprobada", "rechazada", "vencida"]).optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.array(aprobacionSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.aprobacion.findMany({
      where: input.estado ? { estado: input.estado } : {},
      orderBy: { createdAt: "desc" },
      take: input.limite,
    });
    return vista(ctx, filas);
  },
});

export const aprobacionesGet = defineCapability({
  id: "core.aprobaciones.get",
  descripcion:
    "Una aprobación con su input completo, estado y, si se aprobó, el resultado de la ejecución. Los agentes la consultan para saber si su acción se hizo.",
  permiso: null,
  input: z.object({ id: uuidSchema }),
  output: aprobacionSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const a = await ctx.db.aprobacion.findUnique({ where: { id: input.id } });
    const propia = ctx.agente && a?.apiKeyId === ctx.agente.apiKeyId;
    if (!a || (!propia && !ctx.autorizar(PERMISOS_CORE.aprobacionesManage)))
      throw noEncontrado("La aprobación");
    return (await vista(ctx, [a]))[0] as z.input<typeof aprobacionSchema>;
  },
});
