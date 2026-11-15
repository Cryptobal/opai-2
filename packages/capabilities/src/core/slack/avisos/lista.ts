import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../../define";
import { iso } from "../../comun";
import { cursorDe, pagina } from "../../maestros/comun";

const avisoSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  titulo: z.string(),
  gestion: z.string(),
  instalacionId: z.string().nullable(),
  creadoEn: z.string(),
  tomadoEn: z.string().nullable(),
});

/** Avisos de terreno de las últimas 48 horas (CAR-294), para ver qué falta tomar o cerrar. */
export const avisosTerrenoList = defineCapability({
  id: "core.avisos_terreno.list",
  descripcion:
    "Lista los avisos de terreno de las últimas 48 horas (atrasos, ausencias, incidentes, pánico) con su estado en OPAI: abierto, tomado o cerrado. Un supervisor ve solo los de sus instalaciones. Paginada por cursor, del más reciente al más antiguo.",
  permiso: PERMISOS_CORE.avisosTerrenoGestionar,
  portales: ["erp", "supervisor"], // El supervisor es el destinatario principal de los avisos (F4).
  // Lectura de avisos que nombran a personas (NÚCLEO-H): se auditan los ids revelados.
  auditarLectura: (s) => s.items.map((a) => a.id),
  // CAR-353: contrato único de listas (cursor + limite; items + siguiente).
  input: z.object({
    gestion: z.enum(["abierto", "tomado", "cerrado"]).optional(),
    limite: z.number().int().min(1).max(200).default(200),
    cursor: z.uuid().optional().describe("Id del último aviso de la página anterior."),
  }),
  output: z.object({ items: z.array(avisoSchema), siguiente: z.string().nullable() }),
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
      // UUIDv7: el id ya ordena por creación y sirve de cursor estable.
      orderBy: { id: "desc" },
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    return {
      items: items.map((a) => ({
        id: a.id,
        tipo: a.tipo,
        titulo: a.titulo,
        gestion: a.gestion,
        instalacionId: a.instalacionId,
        creadoEn: iso(a.createdAt) ?? "",
        tomadoEn: iso(a.tomadoEn),
      })),
      siguiente,
    };
  },
});
