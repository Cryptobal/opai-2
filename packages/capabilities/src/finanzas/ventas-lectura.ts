import { z } from "zod";

import { ESTADOS_DTE_EMITIDO, finDePeriodo, signoDte, type TipoDteCompra } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { aFecha, cursorDe, pagina } from "../core/maestros/comun";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";
import { vistasDeVentas } from "./ventas-consulta";
import { ventaSchema } from "./vistas-venta";

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período aaaa-mm.");

export const ventasListar = defineCapability({
  id: "finanzas.ventas.listar",
  descripcion:
    "Lista el libro de ventas con facturas y notas de crédito emitidas o en borrador: cliente, folio, montos y estado ante el SII y de cobro. Filtra por período de emisión, estado DTE o texto (folio o nombre del cliente).",
  permiso: PERMISO_READ,
  input: z.object({
    periodo: periodoSchema.optional().describe("Mes de emisión, aaaa-mm."),
    estadoDte: z.enum(ESTADOS_DTE_EMITIDO).optional(),
    q: z.string().trim().max(120).optional().describe("Folio o nombre del cliente."),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    items: z.array(ventaSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.map((i: z.infer<typeof ventaSchema>) => i.cuentaId))],
  async handler(ctx, input) {
    const folio = input.q && /^\d{1,9}$/.test(input.q) ? Number(input.q) : null;
    let cuentaIds: string[] | undefined;
    if (input.q && folio === null) {
      const cs = await ctx.db.cuenta.findMany({
        where: { nombre: { contains: input.q, mode: "insensitive" } },
        select: { id: true },
        take: 50,
      });
      cuentaIds = cs.map((c) => c.id);
      if (cuentaIds.length === 0) return { items: [], siguiente: null };
    }
    const where = {
      ...(input.periodo
        ? {
            fechaEmision: {
              gte: aFecha(`${input.periodo}-01`),
              lt: aFecha(finDePeriodo(input.periodo)),
            },
          }
        : {}),
      ...(input.estadoDte ? { estadoDte: input.estadoDte } : {}),
      ...(folio !== null ? { folio } : {}),
      ...(cuentaIds ? { cuentaId: { in: cuentaIds } } : {}),
    };
    const filas = await ctx.db.documentoEmitido.findMany({
      where,
      include: { lineas: { orderBy: { orden: "asc" } } },
      orderBy: [{ fechaEmision: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items, siguiente } = pagina(filas, input.limite);
    return { items: await vistasDeVentas(ctx, items), siguiente };
  },
});

export const ventasObtener = defineCapability({
  id: "finanzas.ventas.obtener",
  descripcion:
    "Devuelve el detalle de un documento del libro de ventas, con líneas, montos, estados DTE y de cobro, y datos del cliente.",
  permiso: PERMISO_READ,
  input: z.object({ documentoId: uuidSchema }),
  output: ventaSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s: z.infer<typeof ventaSchema>) => [s.cuentaId],
  async handler(ctx, input) {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      include: { lineas: { orderBy: { orden: "asc" } } },
    });
    if (!doc) throw noEncontrado("El documento");
    const [vista] = await vistasDeVentas(ctx, [doc]);
    return vista!;
  },
});

export const ventasLibroResumen = defineCapability({
  id: "finanzas.ventas.libro_resumen",
  descripcion:
    "Totales del libro de ventas en un período de emisión: cantidad de documentos y sumas de neto, IVA y total (las notas de crédito restan).",
  permiso: PERMISO_READ,
  input: z.object({ periodo: periodoSchema }),
  output: z.object({
    periodo: periodoSchema,
    documentos: z.number().int(),
    neto: z.number().int(),
    iva: z.number().int(),
    total: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const where = {
      fechaEmision: { gte: aFecha(`${input.periodo}-01`), lt: aFecha(finDePeriodo(input.periodo)) },
      estadoDte: { not: "borrador" },
    };
    const porTipo = await ctx.db.documentoEmitido.groupBy({
      by: ["tipoDte"],
      where,
      _count: { _all: true },
      _sum: { montoNeto: true, montoIva: true, montoTotal: true },
    });
    const firmado = (pick: (g: (typeof porTipo)[number]) => number | null) =>
      porTipo.reduce((a, g) => a + signoDte(g.tipoDte as TipoDteCompra) * (pick(g) ?? 0), 0);
    return {
      periodo: input.periodo,
      documentos: porTipo.reduce((a, g) => a + g._count._all, 0),
      neto: firmado((g) => g._sum.montoNeto),
      iva: firmado((g) => g._sum.montoIva),
      total: firmado((g) => g._sum.montoTotal),
    };
  },
});
