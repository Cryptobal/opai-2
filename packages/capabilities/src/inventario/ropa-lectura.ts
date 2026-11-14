import { ETIQUETA_MOTIVO, MOTIVOS_MOVIMIENTO } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { PERMISOS_INVENTARIO } from "./comun";

const prendaSchema = z.object({
  tipoId: z.string(),
  nombre: z.string(),
  activo: z.boolean(),
  existencias: z.array(z.object({ talla: z.string(), cantidad: z.number().int() })),
  total: z.number().int(),
});

export const ropaList = defineCapability({
  id: "inventario.ropa.list",
  descripcion:
    "Lista los tipos de ropa de la empresa con cuántas unidades hay de cada talla y el total disponible, ordenados por nombre. Por defecto solo los tipos activos.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({
    incluirInactivos: z.boolean().default(false),
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({ items: z.array(prendaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { incluirInactivos, cursor, limite }) {
    const tipos = await ctx.db.inventarioTipo.findMany({
      where: {
        categoria: "ropa",
        ...(incluirInactivos ? {} : { activo: true }),
        ...(cursor ? { nombreNormalizado: { gt: cursor } } : {}),
      },
      orderBy: { nombreNormalizado: "asc" },
      take: limite + 1,
    });
    const pagina = tipos.slice(0, limite);
    const filas = await ctx.db.inventarioExistencia.findMany({
      where: { tipoId: { in: pagina.map((t) => t.id) } },
      select: { tipoId: true, talla: true, cantidad: true },
    });
    return {
      items: pagina.map((t) => {
        // Una talla sin movimientos aparece con 0; una talla que el tipo ya no ofrece, si tiene unidades.
        const hay = new Map(filas.filter((f) => f.tipoId === t.id).map((f) => [f.talla, f.cantidad]));
        const tallas = [...t.tallas, ...[...hay.keys()].filter((k) => !t.tallas.includes(k) && (hay.get(k) ?? 0) > 0)];
        const existencias = tallas.map((talla) => ({ talla, cantidad: hay.get(talla) ?? 0 }));
        return {
          tipoId: t.id,
          nombre: t.nombre,
          activo: t.activo,
          existencias,
          total: existencias.reduce((s, e) => s + e.cantidad, 0),
        };
      }),
      siguiente: tipos.length > limite ? (pagina.at(-1)?.nombreNormalizado ?? null) : null,
    };
  },
});

export const ropaMovimientos = defineCapability({
  id: "inventario.ropa.movimientos",
  descripcion:
    "Historial de movimientos de un tipo de ropa, del más reciente al más antiguo: ingresos, ajustes, entregas y devoluciones, con la talla, cuántas unidades sumó o restó, la nota y cuándo.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({
    tipoId: uuidSchema,
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        talla: z.string(),
        delta: z.number().int(),
        motivo: z.enum(MOTIVOS_MOVIMIENTO),
        motivoEtiqueta: z.string(),
        nota: z.string().nullable(),
        fecha: z.string(),
      }),
    ),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { tipoId, cursor, limite }) {
    const tipo = await ctx.db.inventarioTipo.findFirst({ where: { id: tipoId, categoria: "ropa" } });
    if (!tipo) throw noEncontrado("El tipo de ropa");
    const filas = await ctx.db.inventarioMovimiento.findMany({
      where: { tipoId, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: "desc" },
      take: limite + 1,
    });
    const pagina = filas.slice(0, limite);
    return {
      items: pagina.map((f) => {
        const motivo = MOTIVOS_MOVIMIENTO.find((m) => m === f.motivo) ?? "ajuste";
        return {
          id: f.id,
          talla: f.talla,
          delta: f.delta,
          motivo,
          motivoEtiqueta: ETIQUETA_MOTIVO[motivo],
          nota: f.nota,
          fecha: f.createdAt.toISOString(),
        };
      }),
      siguiente: filas.length > limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  },
});
