import { z } from "zod";

import { vencimientoPago } from "@opai/domain";

import { defineCapability } from "../define";
import { dia, hoy, listaSchema } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { pagadoPorCompra } from "./compras-consulta";

const filaSchema = z.object({
  proveedorId: z.string(),
  rut: z.string(),
  razonSocial: z.string(),
  documentosConSaldo: z.number().int(),
  saldoPorPagar: z.number().int(),
  saldoVencido: z.number().int().describe("Saldo de documentos cuyo plazo de pago ya pasó."),
});

/** Lista proveedores con saldo por pagar, agrupando compras según la conciliación bancaria (equivalente 1.0 pagos-proveedores). */
export const comprasPagosProveedores = defineCapability({
  id: "finanzas.compras.pagos_proveedores",
  descripcion:
    "Pagos a proveedores: cada proveedor con saldo pendiente, cuántos documentos tienen saldo y el total por pagar (incluido lo vencido). El saldo sale solo de la conciliación bancaria.",
  permiso: PERMISO_READ,
  input: listaSchema.omit({ incluirArchivadas: true }),
  output: z.object({
    items: z.array(filaSchema),
    siguiente: z.string().nullable(),
    totalPorPagar: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.proveedorId),
  async handler(ctx, input) {
    const h = hoy();
    const q = input.q?.replace(/[.\s]/g, "");
    const docs = await ctx.db.documentoRecibido.findMany({
      where: {
        tipoDte: { not: 61 },
        ...(input.q
          ? {
              proveedor: {
                OR: [
                  { razonSocial: { contains: input.q, mode: "insensitive" } },
                  ...(q ? [{ rut: { contains: q, mode: "insensitive" as const } }] : []),
                ],
              },
            }
          : {}),
      },
      include: { proveedor: true },
    });
    const pagado = await pagadoPorCompra(
      ctx,
      docs.map((d) => d.id),
    );
    const map = new Map<string, z.input<typeof filaSchema>>();
    for (const d of docs) {
      const pago = pagado.get(d.id) ?? 0;
      const saldo = Math.max(d.montoTotal - pago, 0);
      if (saldo <= 0) continue;
      const emision = dia(d.fechaEmision) ?? h;
      const vence = vencimientoPago(emision, d.proveedor.plazoPagoDias);
      const prev = map.get(d.proveedorId) ?? {
        proveedorId: d.proveedorId,
        rut: d.proveedor.rut,
        razonSocial: d.proveedor.razonSocial,
        documentosConSaldo: 0,
        saldoPorPagar: 0,
        saldoVencido: 0,
      };
      prev.documentosConSaldo += 1;
      prev.saldoPorPagar += saldo;
      if (vence < h) prev.saldoVencido += saldo;
      map.set(d.proveedorId, prev);
    }
    const todos = [...map.values()].sort((a, b) => b.saldoPorPagar - a.saldoPorPagar || a.razonSocial.localeCompare(b.razonSocial));
    const desde = input.cursor ? todos.findIndex((i) => i.proveedorId === input.cursor) + 1 : 0;
    const items = todos.slice(desde, desde + input.limite);
    const siguiente = desde + input.limite < todos.length ? items[items.length - 1]?.proveedorId ?? null : null;
    return { items, siguiente, totalPorPagar: todos.reduce((s, i) => s + i.saldoPorPagar, 0) };
  },
});