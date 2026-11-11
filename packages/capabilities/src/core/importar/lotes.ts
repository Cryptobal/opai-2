import { z } from "zod";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { PERMISO_IMPORTAR } from "./capacidades";
import { conteosSchema, loteSchema } from "./esquemas";
import { revertirLote } from "./revertir";
import { VERSION_MOTOR } from "./tipos";

const numero = (v: unknown) => (typeof v === "number" ? v : 0);

export const importarLotes = defineCapability({
  id: "core.importar.lotes",
  descripcion:
    "Historial de las cargas de datos hechas con el importador: qué se importó, desde qué archivo, quién lo hizo, cuántos registros creó o completó y si el lote fue revertido.",
  permiso: PERMISO_IMPORTAR,
  portales: ["erp"],
  input: z.object({ limite: z.number().int().min(1).max(100).default(30) }),
  output: z.object({ items: z.array(loteSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.importacion.findMany({
      where: { versionContrato: VERSION_MOTOR },
      orderBy: { iniciadaEn: "desc" },
      take: input.limite,
    });
    const ids = [...new Set(filas.map((f) => f.lanzadaPorId).filter((x): x is string => !!x))];
    const usuarios = ids.length ? await ctx.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const nombre = new Map(usuarios.map((u) => [u.id, u.name]));
    return {
      items: filas.map((f) => {
        const c = (f.conteos ?? {}) as Record<string, unknown>;
        return {
          id: f.id,
          importador: typeof c["importador"] === "string" ? c["importador"] : "",
          archivo: typeof c["archivo"] === "string" ? c["archivo"] : null,
          origen: f.origen,
          sistema: f.sistema,
          estado: f.estado as z.infer<typeof loteSchema>["estado"],
          conteos: { crear: numero(c["crear"]), actualizar: numero(c["actualizar"]), sin_cambio: numero(c["sin_cambio"]), error: numero(c["error"]) },
          lanzadaPor: f.lanzadaPorId ? (nombre.get(f.lanzadaPorId) ?? null) : null,
          iniciadaEn: f.iniciadaEn.toISOString(),
          terminadaEn: f.terminadaEn?.toISOString() ?? null,
          revertidaEn: f.revertidaEn?.toISOString() ?? null,
        };
      }),
    };
  },
});

export const importarRevertir = defineCapability({
  id: "core.importar.revertir",
  descripcion:
    "Revierte un lote de importación: borra los registros que creó y devuelve a su valor anterior los que completó. Si alguno se modificó después o ya tiene datos asociados, no revierte nada y dice cuáles. La vista previa muestra qué pasaría.",
  permiso: PERMISO_IMPORTAR,
  portales: ["erp"],
  input: z.object({ importacionId: uuidSchema.describe("Id del lote (de core.importar.lotes).") }),
  output: z.object({
    revertido: z.boolean(),
    aBorrar: z.number().int(),
    aRestaurar: z.number().int(),
    bloqueadas: z.array(z.object({ registro: z.string(), motivo: z.string() })),
    conteos: conteosSchema.optional(),
  }),
  efecto: "irreversible",
  dryRun: true,
  handler: (ctx, input, { dryRun }) => revertirLote(ctx, input.importacionId, dryRun),
});
