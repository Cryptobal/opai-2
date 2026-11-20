import { z } from "zod";

import { defineCapability } from "../define";
import { hoy, listaSchema } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { leerProveedoresPendientes, paginarProveedoresPendientes } from "./compras-pagos-agregado";

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
    const fecha = hoy();
    const agregados = await ctx.transaccion((tx) => leerProveedoresPendientes(tx, ctx.tenantId, fecha, input.q));
    return paginarProveedoresPendientes(agregados, input.limite, input.cursor);
  },
});
