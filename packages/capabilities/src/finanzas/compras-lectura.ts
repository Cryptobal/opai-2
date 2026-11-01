import { z } from "zod";

import { ESTADOS_RECEPCION, finDePeriodo, signoDte, type TipoDteCompra } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { aFecha, cursorDe, pagina } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { vistasDeCompras } from "./compras-consulta";
import { compraSchema } from "./vistas-compra";

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período aaaa-mm.");

export const comprasListar = defineCapability({
  id: "finanzas.compras.listar",
  descripcion:
    "Lista el libro de compras: documentos recibidos con folio, proveedor, montos, centro de costo, plazo para aceptar o reclamar y la sugerencia de centro de costo cuando falta. Filtra por período de recepción, proveedor, estado o solo los sin centro de costo; incluye totales del filtro. El estado de pago llega con la conciliación.",
  permiso: PERMISO_READ,
  input: z.object({
    periodo: periodoSchema.optional().describe("Mes de recepción, aaaa-mm."),
    proveedorId: uuidSchema.optional(),
    sinCentroCosto: z.boolean().optional().describe("Solo los documentos sin centro de costo asignado."),
    estadoRecepcion: z.enum(ESTADOS_RECEPCION).optional(),
    q: z.string().trim().max(120).optional().describe("Folio o nombre del proveedor."),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    items: z.array(compraSchema),
    siguiente: z.string().nullable(),
    resumen: z.object({
      documentos: z.number().int(),
      sinCentroCosto: z.number().int(),
      neto: z.number().int().describe("Las notas de crédito restan."),
      iva: z.number().int(),
      total: z.number().int(),
    }),
  }),
  efecto: "lectura",
  dryRun: false,
  // El libro revela RUT y razón social de los proveedores de la página: se auditan sus ids.
  auditarLectura: (s) => [...new Set(s.items.map((i) => i.proveedorId))],
  async handler(ctx, input) {
    const folio = input.q && /^\d{1,9}$/.test(input.q) ? Number(input.q) : null;
    const where = {
      ...(input.periodo
        ? { fechaRecepcion: { gte: aFecha(`${input.periodo}-01`), lt: aFecha(finDePeriodo(input.periodo)) } }
        : {}),
      ...(input.proveedorId ? { proveedorId: input.proveedorId } : {}),
      ...(input.sinCentroCosto ? { centroCostoId: null } : {}),
      ...(input.estadoRecepcion ? { estadoRecepcion: input.estadoRecepcion } : {}),
      ...(input.q
        ? {
            OR: [
              ...(folio !== null ? [{ folio }] : []),
              { proveedor: { razonSocial: { contains: input.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    const [filas, porTipo, sinCentro] = await Promise.all([
      ctx.db.documentoRecibido.findMany({
        where,
        include: { proveedor: true },
        orderBy: [{ fechaRecepcion: "desc" }, { id: "desc" }],
        take: input.limite + 1,
        ...cursorDe(input.cursor),
      }),
      ctx.db.documentoRecibido.groupBy({
        by: ["tipoDte"],
        where,
        _count: { _all: true },
        _sum: { montoNeto: true, montoIva: true, montoTotal: true },
      }),
      ctx.db.documentoRecibido.count({ where: { ...where, centroCostoId: null } }),
    ]);
    const { items, siguiente } = pagina(filas, input.limite);
    const firmado = (pick: (g: (typeof porTipo)[number]) => number | null) =>
      porTipo.reduce((a, g) => a + signoDte(g.tipoDte as TipoDteCompra) * (pick(g) ?? 0), 0);
    return {
      items: await vistasDeCompras(ctx, items),
      siguiente,
      resumen: {
        documentos: porTipo.reduce((a, g) => a + g._count._all, 0),
        sinCentroCosto: sinCentro,
        neto: firmado((g) => g._sum.montoNeto),
        iva: firmado((g) => g._sum.montoIva),
        total: firmado((g) => g._sum.montoTotal),
      },
    };
  },
});
