import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { cursorDe, pagina } from "../core/maestros/comun";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";
import {
  enriquecerProgramaciones,
  type FilaProg,
  programacionSchema,
} from "./ventas-programacion-vistas";
import { ufCentavosUltima } from "./ventas-programacion-uf";

export { programacionSchema } from "./ventas-programacion-vistas";

export const ventasProgramacionesListar = defineCapability({
  id: "finanzas.ventas_programacion.listar",
  descripcion:
    "Lista las plantillas de facturación recurrente del tenant: cliente, instalación, montos, día de generación y destinatarios de proforma/estado de pago.",
  permiso: PERMISO_READ,
  input: z.object({
    activa: z.boolean().optional(),
    q: z.string().trim().max(120).optional(),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    items: z.array(programacionSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.flatMap((i) => (i.cuentaId ? [i.cuentaId] : [])))],
  async handler(ctx, input) {
    const where: Record<string, unknown> = {};
    if (input.activa !== undefined) where.activa = input.activa;
    if (input.q) where.nombre = { contains: input.q, mode: "insensitive" };
    const filas = await ctx.db.ventasProgramacion.findMany({
      where,
      include: {
        lineas: { orderBy: { orden: "asc" } },
        destinatarios: { orderBy: { orden: "asc" } },
      },
      orderBy: [{ activa: "desc" }, { nombre: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items: slice, siguiente } = pagina(filas, input.limite);
    const cuentaMap = new Map(
      (
        await ctx.db.cuenta.findMany({
          where: { id: { in: [...new Set(slice.map((f) => f.cuentaId).filter((x): x is string => x !== null))] } },
          select: { id: true, nombre: true },
        })
      ).map((c) => [c.id, c.nombre]),
    );
    const instIds = [...new Set(slice.map((f) => f.instalacionId).filter(Boolean))] as string[];
    const instMap = new Map(
      instIds.length
        ? (
            await ctx.db.instalacion.findMany({
              where: { id: { in: instIds } },
              select: { id: true, nombre: true },
            })
          ).map((i) => [i.id, i.nombre])
        : [],
    );
    const items = await enriquecerProgramaciones(ctx, slice as FilaProg[], cuentaMap, instMap, await ufCentavosUltima(ctx.db));
    return { items, siguiente };
  },
});

export const ventasProgramacionesObtener = defineCapability({
  id: "finanzas.ventas_programacion.obtener",
  descripcion: "Detalle de una plantilla de facturación recurrente con líneas y destinatarios.",
  permiso: PERMISO_READ,
  input: z.object({ programacionId: uuidSchema }),
  output: programacionSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => (s.cuentaId ? [s.cuentaId] : []),
  async handler(ctx, input) {
    const f = await ctx.db.ventasProgramacion.findFirst({
      where: { id: input.programacionId },
      include: {
        lineas: { orderBy: { orden: "asc" } },
        destinatarios: { orderBy: { orden: "asc" } },
      },
    });
    if (!f) throw noEncontrado("La programación");
    const cuentaMap = new Map(
      (
        await ctx.db.cuenta.findMany({
          where: { id: f.cuentaId ?? "00000000-0000-0000-0000-000000000000" },
          select: { id: true, nombre: true },
        })
      ).map((c) => [c.id, c.nombre]),
    );
    const instMap = f.instalacionId
      ? new Map(
          (
            await ctx.db.instalacion.findMany({
              where: { id: f.instalacionId },
              select: { id: true, nombre: true },
            })
          ).map((i) => [i.id, i.nombre]),
        )
      : new Map<string, string>();
    const [item] = await enriquecerProgramaciones(ctx, [f as FilaProg], cuentaMap, instMap, await ufCentavosUltima(ctx.db));
    return item!;
  },
});
