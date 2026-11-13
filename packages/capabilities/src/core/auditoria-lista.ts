import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido } from "../errores";
import { sinPlataformaAjena } from "../agentes/plataforma";
import { auditarHistorialSensible, redactarSensibles } from "./panel/actividad-sensible";
import { visibleSinNoRecontratar } from "./panel/actividad-no-recontratar";
import { auditoriaSelect } from "./panel/auditoria-select";

export const auditList = defineCapability({
  auditarLectura: (s) => s.items.map((e) => e.id),
  id: "core.audit.list",
  descripcion:
    "Auditoría de escrituras de la empresa, más reciente primero. Paginado por cursor; filtros por capacidad y actor.",
  permiso: PERMISOS_CORE.auditRead,
  input: z.object({
    capability: z.string().optional(),
    actorId: z.string().optional(),
    limite: z.number().int().min(1).max(200).default(50),
    cursor: z.uuid().optional(),
  }),
  // CAR-353: contrato único de listas; la salida pasa de `eventos` a `items`.
  output: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        actorType: z.string(),
        actorId: z.string().nullable(),
        viaUserId: z.string().nullable(),
        capability: z.string(),
        entityType: z.string().nullable(),
        entityId: z.string().nullable(),
        payload: z.unknown(),
        createdAt: z.date(),
      }),
    ),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (ctx.alcance) throw prohibido("No tienes acceso a esta actividad.");
    const filas = await ctx.db.auditEvent.findMany({
      select: auditoriaSelect,
      where: {
        ...sinPlataformaAjena(),
        ...(input.capability ? { capability: input.capability } : {}),
        ...(input.actorId
          ? { OR: [{ actorId: input.actorId }, { viaUserId: input.actorId }] }
          : {}),
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const eventos = filas.slice(0, input.limite);
    await auditarHistorialSensible(ctx, eventos, "core.audit.list");
    const visibleMarca = visibleSinNoRecontratar(ctx);
    return {
      items: eventos.filter(visibleMarca).map((f) => {
        const payload = (f.payload ?? {}) as Record<string, unknown>;
        const entrada = payload["input"];
        return {
          ...f,
          payload:
            entrada && typeof entrada === "object" && !Array.isArray(entrada)
              ? {
                  ...payload,
                  input: redactarSensibles(ctx, f.capability, entrada as Record<string, unknown>),
                }
              : f.payload,
        };
      }),
      siguiente: filas.length > input.limite ? (eventos.at(-1)?.id ?? null) : null,
    };
  },
});
