import { z } from "zod";

import {
  ESTADOS_CESION,
  ESTADOS_COBRO_VENTA,
  ESTADOS_DTE_EMITIDO,
} from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { aFecha, cursorDe, diaSchema, pagina } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { vistasDeVentas } from "./ventas-consulta";
import { ventaSchema } from "./vistas-venta";

/** RUT sin puntos ni espacios y en mayúscula, como se guarda en la cuenta. */
export const rutNormalizado = (rut: string) => rut.replace(/[.\s]/g, "").toUpperCase();

export const ventasBuscar = defineCapability({
  id: "finanzas.ventas.buscar",
  descripcion:
    "Búsqueda avanzada en el libro de ventas para agentes: por RUT o cuenta del cliente, folio, tipo de documento, estado ante el SII, estado de cobro, estado de cesión, rango de fechas de emisión y rango de monto total. Devuelve los mismos documentos que el libro, paginados por cursor.",
  permiso: PERMISO_READ,
  input: z.object({
    rut: z.string().trim().min(2).max(14).optional().describe("RUT del cliente, con o sin puntos y guion."),
    cuentaId: uuidSchema.optional(),
    folio: z.number().int().positive().optional(),
    tipoDte: z
      .union([z.literal(33), z.literal(34), z.literal(61)])
      .optional()
      .describe("33 factura, 34 factura exenta, 61 nota de crédito."),
    estadoDte: z.enum(ESTADOS_DTE_EMITIDO).optional(),
    estadoCobro: z.enum(ESTADOS_COBRO_VENTA).optional(),
    cesionEstado: z.enum(ESTADOS_CESION).optional(),
    emitidaDesde: diaSchema.optional(),
    emitidaHasta: diaSchema.optional().describe("Inclusive."),
    montoMin: z.number().int().min(0).optional().describe("Total en CLP enteros."),
    montoMax: z.number().int().min(0).optional(),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ items: z.array(ventaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.map((i: z.infer<typeof ventaSchema>) => i.cuentaId))],
  async handler(ctx, input) {
    let cuentaIds: string[] | undefined;
    if (input.rut) {
      const cs = await ctx.db.cuenta.findMany({
        where: { rut: { startsWith: rutNormalizado(input.rut) } },
        select: { id: true },
        take: 50,
      });
      cuentaIds = cs.map((c) => c.id);
      if (cuentaIds.length === 0) return { items: [], siguiente: null };
      // Con RUT y cuenta a la vez, la cuenta debe ser una de las del RUT.
      if (input.cuentaId && !cuentaIds.includes(input.cuentaId)) return { items: [], siguiente: null };
    }
    const emision = {
      ...(input.emitidaDesde ? { gte: aFecha(input.emitidaDesde) } : {}),
      ...(input.emitidaHasta ? { lt: new Date(aFecha(input.emitidaHasta).getTime() + 86_400_000) } : {}),
    };
    const monto = {
      ...(input.montoMin !== undefined ? { gte: input.montoMin } : {}),
      ...(input.montoMax !== undefined ? { lte: input.montoMax } : {}),
    };
    const filas = await ctx.db.documentoEmitido.findMany({
      where: {
        ...(cuentaIds ? { cuentaId: { in: cuentaIds } } : {}),
        ...(input.cuentaId ? { cuentaId: input.cuentaId } : {}),
        ...(input.folio ? { folio: input.folio } : {}),
        ...(input.tipoDte ? { tipoDte: input.tipoDte } : {}),
        ...(input.estadoDte ? { estadoDte: input.estadoDte } : {}),
        ...(input.estadoCobro ? { estadoCobro: input.estadoCobro } : {}),
        ...(input.cesionEstado ? { cesionEstado: input.cesionEstado } : {}),
        ...(Object.keys(emision).length ? { fechaEmision: emision } : {}),
        ...(Object.keys(monto).length ? { montoTotal: monto } : {}),
      },
      include: { lineas: { orderBy: { orden: "asc" } } },
      orderBy: [{ fechaEmision: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items, siguiente } = pagina(filas, input.limite);
    return { items: await vistasDeVentas(ctx, items), siguiente };
  },
});
