import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";
import { vistasDeCompras } from "./compras-consulta";
import { compraSchema } from "./vistas-compra";

/** Un documento del libro de compras, para el panel de detalle del maestro-detalle (CAR-256). */
export const comprasGet = defineCapability({
  id: "finanzas.compras.get",
  descripcion:
    "Muestra un documento recibido del libro de compras: tipo, folio, proveedor, fechas, montos, centro de costo (o el sugerido), estado de recepción, plazo para aceptar o reclamar, vencimiento de pago y estado de pago con lo pagado y el saldo según la conciliación bancaria.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: compraSchema,
  efecto: "lectura",
  dryRun: false,
  // Revela RUT y razón social del proveedor: se audita su id, como en el libro.
  auditarLectura: (s) => [s.proveedorId],
  async handler(ctx, input) {
    const fila = await ctx.db.documentoRecibido.findFirst({ where: { id: input.id }, include: { proveedor: true } });
    if (!fila) throw noEncontrado("El documento");
    const [vista] = await vistasDeCompras(ctx, [fila]);
    if (!vista) throw noEncontrado("El documento");
    return vista;
  },
});
