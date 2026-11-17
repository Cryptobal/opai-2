import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_READ } from "./comun";
import { obtenerVistaCompra } from "./compras-consulta";
import { compraSchema } from "./vistas-compra";

/** Un documento del libro de compras, para el panel de detalle del maestro-detalle (CAR-256). */
export const comprasGet = defineCapability({
  id: "finanzas.compras.get",
  descripcion:
    "Muestra un documento recibido del libro de compras: tipo, folio, proveedor, fechas, montos, centro de costo (o el sugerido), estado de recepción y plazo para aceptar o reclamar.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: compraSchema,
  efecto: "lectura",
  dryRun: false,
  // Revela RUT y razón social del proveedor: se audita su id, como en el libro.
  auditarLectura: (s) => [s.proveedorId],
  async handler(ctx, input) {
    return obtenerVistaCompra(ctx, input.id);
  },
});
