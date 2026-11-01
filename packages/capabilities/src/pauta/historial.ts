import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { instalacionesEnAlcance } from "../core/maestros/alcance";
import { cursorDe, listaSchema, pagina } from "../core/maestros/comun";
import { PERMISO_READ, fechaIso } from "./comun";

const lineaSchema = z.object({
  id: z.string(),
  accion: z.enum(["serie_fijada", "excepcion_creada", "excepcion_anulada"]),
  puestoId: z.string(),
  puesto: z.string(),
  instalacionId: z.string(),
  actorTipo: z.string(),
  actorNombre: z.string().nullable(),
  desde: z.string(),
  hasta: z.string(),
  detalle: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  creadoEn: z.string(),
});

/** Historial de cambios de la pauta (P04): quién, cuándo y qué, de una instalación o un puesto. */
export const historialListar = defineCapability({
  id: "pauta.historial.listar",
  descripcion:
    "Historial de cambios de la pauta: quién fijó una serie o registró y anuló una excepción, cuándo, sobre qué puesto y qué días. Se filtra por instalación o por puesto; lo más reciente primero.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    puestoId: uuidSchema.optional(),
    cursor: listaSchema.shape.cursor,
    limite: z.number().int().min(1).max(100).default(30),
  }),
  output: z.object({ items: z.array(lineaSchema), siguiente: z.string().nullable() }),
  auditarLectura: (s) => [...new Set(s.items.map((i) => i.puestoId))],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ids = instalacionesEnAlcance(ctx);
    const filas = await ctx.db.historialPauta.findMany({
      where: {
        ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
        ...(input.puestoId ? { puestoId: input.puestoId } : {}),
        // El alcance va en la consulta (ADR-022): un supervisor solo ve el historial de lo suyo.
        ...(ids ? { AND: [{ instalacionId: { in: [...ids] } }] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items, siguiente } = pagina(filas, input.limite);
    const puestos = new Map(
      (
        await ctx.db.puesto.findMany({
          where: { id: { in: [...new Set(items.map((i) => i.puestoId))] } },
          select: { id: true, nombre: true },
        })
      ).map((p) => [p.id, p.nombre]),
    );
    return {
      siguiente,
      items: items.map((h) => {
        const detalle = (h.detalle ?? {}) as Record<string, string | number | null>;
        const { actorNombre, ...resto } = detalle;
        return {
          id: h.id,
          accion: h.accion as z.infer<typeof lineaSchema>["accion"],
          puestoId: h.puestoId,
          puesto: puestos.get(h.puestoId) ?? "Puesto",
          instalacionId: h.instalacionId,
          actorTipo: h.actorTipo,
          actorNombre: typeof actorNombre === "string" ? actorNombre : null,
          desde: fechaIso(h.fechaDesde),
          hasta: fechaIso(h.fechaHasta),
          detalle: resto,
          creadoEn: h.createdAt.toISOString(),
        };
      }),
    };
  },
});
