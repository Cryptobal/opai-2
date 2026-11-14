import { z } from "zod";

import { NOMBRE_TIPO_DTE_VENTA, type TipoDteVenta } from "@opai/domain";

import { ajuste } from "../core/config/valores";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, prohibido } from "../errores";
import { pdfDeDocumento } from "../finanzas/ventas-pdf-doc";
import type { Contexto } from "../types";
import { type AccesoResuelto, PERMISO_PORTAL, accesoDelActor } from "./comun";
import { configDeCuenta } from "./config-datos";

/** ¿La cuenta ve sus facturas? Finanzas activo, la empresa no las apagó y la cuenta las encendió (CAR-518). */
export async function facturasActivas(
  ctx: Contexto,
  visibles: readonly string[],
): Promise<boolean> {
  if (!ctx.modulosActivos.includes("finanzas") || !visibles.includes("facturas")) return false;
  return (await ajuste<boolean>(ctx, "portal_cliente", "seccion_facturas")) !== false;
}

/** Acceso del contacto con las facturas encendidas, o FORBIDDEN. */
async function accesoConFacturas(ctx: Contexto): Promise<AccesoResuelto> {
  const a = await accesoDelActor(ctx);
  const { config } = await configDeCuenta(ctx, a.cuentaId);
  if (!(await facturasActivas(ctx, config.seccionesVisibles)))
    throw prohibido("Tu empresa de seguridad no muestra las facturas en el portal.");
  return a;
}

/**
 * Documentos emitidos que ve el contacto (ADR-022): de su cuenta y ya emitidos ante el SII. Los de una instalación,
 * solo si está en su acceso; los de la cuenta sin instalación, solo si ve todas las instalaciones.
 */
function dondeFacturas(a: AccesoResuelto) {
  return {
    cuentaId: a.cuentaId,
    folio: { not: null },
    estadoDte: { in: ["enviado", "aceptado", "anulado_nc"] },
    OR: [
      { instalacionId: { in: a.instalacionIds } },
      ...(a.todasInstalaciones ? [{ instalacionId: null }] : []),
    ],
  };
}

const facturaSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  folio: z.number().int(),
  fechaEmision: z.string().nullable(),
  fechaVencimiento: z.string().nullable(),
  montoTotal: z.number().int(),
  /** borrador no aparece; `anulado_nc` = anulada con nota de crédito. */
  estadoDte: z.string(),
  /** pendiente | pagada_parcial | pagada | cedida. */
  estadoCobro: z.string(),
  instalacion: z.string().nullable(),
});

const fecha = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export const facturasListar = defineCapability({
  id: "portal_cliente.facturas.listar",
  descripcion:
    "Facturas y notas emitidas a la cuenta del contacto en el Portal Cliente, de la más reciente a la más antigua: tipo, folio, fechas, total y estado de cobro. Solo si la empresa encendió las facturas para su cuenta. Pagina con cursor.",
  permiso: PERMISO_PORTAL,
  input: z.object({
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(100).default(30),
  }),
  output: z.object({ items: z.array(facturaSchema), siguiente: z.string().nullable() }),
  // La cuenta puede ser una persona natural: la lectura queda auditada con los documentos revelados (NÚCLEO-H).
  auditarLectura: (s) => s.items.map((f) => f.id),
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx, input) {
    const a = await accesoConFacturas(ctx);
    const donde = dondeFacturas(a);
    const desde = input.cursor
      ? await ctx.db.documentoEmitido.findFirst({
          where: { ...donde, id: input.cursor },
          select: { id: true },
        })
      : null;
    if (input.cursor && !desde) throw noEncontrado("La página");
    const filas = await ctx.db.documentoEmitido.findMany({
      where: { ...donde, ...(desde ? { id: { lt: desde.id } } : {}) },
      orderBy: { id: "desc" },
      take: input.limite + 1,
    });
    const nombres = new Map(a.instalaciones.map((i) => [i.id, i.nombre]));
    const pagina = filas.slice(0, input.limite);
    return {
      items: pagina.map((d) => ({
        id: d.id,
        tipo: NOMBRE_TIPO_DTE_VENTA[d.tipoDte as TipoDteVenta] ?? `DTE ${d.tipoDte}`,
        folio: d.folio ?? 0,
        fechaEmision: fecha(d.fechaEmision),
        fechaVencimiento: fecha(d.fechaVencimiento),
        montoTotal: d.montoTotal,
        estadoDte: d.estadoDte,
        estadoCobro: d.estadoCobro,
        instalacion: d.instalacionId ? (nombres.get(d.instalacionId) ?? null) : null,
      })),
      siguiente: filas.length > input.limite ? pagina[pagina.length - 1]!.id : null,
    };
  },
});

export const facturasPdf = defineCapability({
  id: "portal_cliente.facturas.pdf",
  descripcion:
    "PDF de una factura o nota emitida a la cuenta del contacto en el Portal Cliente. Solo documentos que el contacto ve en su lista de facturas.",
  permiso: PERMISO_PORTAL,
  input: z.object({ documentoId: uuidSchema }),
  output: z.object({ base64: z.string(), mime: z.literal("application/pdf") }),
  auditarLectura: (_s, input) => [input.documentoId],
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx, input) {
    const a = await accesoConFacturas(ctx);
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { ...dondeFacturas(a), id: input.documentoId },
    });
    if (!doc) throw noEncontrado("El documento");
    const bytes = await pdfDeDocumento(ctx, doc);
    return { base64: Buffer.from(bytes).toString("base64"), mime: "application/pdf" as const };
  },
});
