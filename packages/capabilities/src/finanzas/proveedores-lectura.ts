import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { cursorDe, listaSchema, pagina } from "../core/maestros/comun";
import { PERMISO_READ, proveedorDe } from "./comun";
import { proveedorSchema, vistaProveedor } from "./vistas";
import { compraSchema, vistaCompra } from "./vistas-compra";

const cuentaCortaSchema = z.object({ id: z.string(), codigo: z.string(), nombre: z.string() });

export const proveedoresListar = defineCapability({
  id: "finanzas.proveedores.listar",
  descripcion:
    "Lista los proveedores del tenant con su RUT, razón social, plazo de pago, cuenta y centro de costo por defecto. Busca por nombre o RUT y pagina por cursor; por defecto solo los activos.",
  permiso: PERMISO_READ,
  input: listaSchema.omit({ incluirArchivadas: true }).extend({ soloActivos: z.boolean().default(true) }),
  output: z.object({ items: z.array(proveedorSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  // Un proveedor persona natural trae RUT, correo y teléfono: se registra solo qué ids se revelaron.
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, input) {
    const q = input.q?.replace(/[.\s]/g, "");
    const filas = await ctx.db.proveedor.findMany({
      where: {
        ...(input.soloActivos ? { activo: true } : {}),
        ...(input.q
          ? {
              OR: [
                { razonSocial: { contains: input.q, mode: "insensitive" } },
                ...(q ? [{ rut: { contains: q, mode: "insensitive" as const } }] : []),
              ],
            }
          : {}),
      },
      orderBy: [{ razonSocial: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items, siguiente } = pagina(filas, input.limite);
    return { items: items.map(vistaProveedor), siguiente };
  },
});

export const proveedoresObtener = defineCapability({
  id: "finanzas.proveedores.obtener",
  descripcion:
    "Devuelve la ficha de un proveedor: sus datos, plazo de pago, cuenta de gasto y por pagar y centro de costo por defecto, el resumen de sus compras y las últimas 20. Los pagos se vinculan cuando exista la conciliación.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    proveedor: proveedorSchema,
    cuentaGasto: cuentaCortaSchema.nullable(),
    cuentaPorPagar: cuentaCortaSchema.nullable(),
    centroCostoNombre: z.string().nullable(),
    resumen: z.object({
      documentos: z.number().int(),
      sinCentroCosto: z.number().int(),
      montoNeto: z.number().int().describe("Neto del libro: las notas de crédito restan."),
    }),
    compras: z.array(compraSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.proveedor.id],
  async handler(ctx, { id }) {
    const p = await proveedorDe(ctx, id);
    const [cuentas, centro, porTipo, sinCentro, compras] = await Promise.all([
      ctx.db.cuentaContable.findMany({
        where: { id: { in: [p.cuentaGastoId, p.cuentaPorPagarId].filter((x): x is string => !!x) } },
        select: { id: true, codigo: true, nombre: true },
      }),
      p.centroCostoId
        ? ctx.db.centroCosto.findFirst({ where: { id: p.centroCostoId }, select: { nombre: true } })
        : null,
      ctx.db.documentoRecibido.groupBy({
        by: ["tipoDte"],
        where: { proveedorId: id },
        _sum: { montoNeto: true },
        _count: { _all: true },
      }),
      ctx.db.documentoRecibido.count({ where: { proveedorId: id, centroCostoId: null } }),
      ctx.db.documentoRecibido.findMany({
        where: { proveedorId: id },
        orderBy: [{ fechaRecepcion: "desc" }, { id: "desc" }],
        take: 20,
      }),
    ]);
    const centros = await ctx.db.centroCosto.findMany({
      where: { id: { in: compras.map((c) => c.centroCostoId).filter((x): x is string => !!x) } },
      select: { id: true, nombre: true },
    });
    const nombreCentro = new Map(centros.map((c) => [c.id, c.nombre]));
    return {
      proveedor: vistaProveedor(p),
      cuentaGasto: cuentas.find((c) => c.id === p.cuentaGastoId) ?? null,
      cuentaPorPagar: cuentas.find((c) => c.id === p.cuentaPorPagarId) ?? null,
      centroCostoNombre: centro?.nombre ?? null,
      resumen: {
        documentos: porTipo.reduce((a, g) => a + g._count._all, 0),
        sinCentroCosto: sinCentro,
        montoNeto: porTipo.reduce((a, g) => a + (g.tipoDte === 61 ? -1 : 1) * (g._sum.montoNeto ?? 0), 0),
      },
      compras: compras.map((c) =>
        vistaCompra(c, p, c.centroCostoId ? (nombreCentro.get(c.centroCostoId) ?? null) : null, null),
      ),
    };
  },
});
