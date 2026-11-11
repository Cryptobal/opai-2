import { z } from "zod";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { PERMISO_COMPRAS } from "./comun";
import { importarDocumentosCompra } from "./compras-importar-nucleo";
import { MAX_FILAS, filaSchema, resultadoFila } from "./compras-importar-esquemas";

/**
 * Importa documentos recibidos en lote (planilla del RCV exportada del SII, o lo que arme un agente).
 * Las filas válidas entran y las con error se reportan sin frenar al resto; repetir la importación no
 * duplica nada (clave: proveedor + tipo + folio).
 */
export const comprasImportar = defineCapability({
  id: "finanzas.compras.importar",
  descripcion:
    "Importa hasta 200 documentos recibidos al libro de compras de una vez. Cada fila trae el RUT del emisor, tipo, folio, fechas y montos. Crea los proveedores nuevos si se pide y hay razón social; los documentos repetidos se omiten y las filas con error se informan sin frenar las demás. Con vista previa antes de confirmar.",
  permiso: PERMISO_COMPRAS,
  input: z.object({
    documentos: z.array(filaSchema).min(1).max(MAX_FILAS),
    crearProveedores: z.boolean().default(false),
  }),
  output: z.object({
    nuevos: z.number().int(),
    duplicados: z.number().int(),
    errores: z.number().int(),
    proveedoresCreados: z.number().int(),
    filas: z.array(resultadoFila),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const r = await importarDocumentosCompra(ctx, input, dryRun, "importacion");
    if (!dryRun && r.nuevos === 0 && r.errores === r.filas.length)
      throw reglaDeNegocio("Ninguna fila se pudo importar; revisa los errores.");
    return r;
  },
});
