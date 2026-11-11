import { z } from "zod";

import { textoOpcional } from "../core/maestros/comun";
import { montoSchema, tipoDteSchema } from "./comun";
import { camposDocumento } from "./compras-escritura";

export const MAX_FILAS = 200;

export const filaSchema = z.object({
  proveedorRut: z.string().trim().describe("RUT del emisor, con o sin puntos."),
  proveedorRazonSocial: z.string().trim().max(160).optional().describe("Necesaria solo si hay que crear el proveedor."),
  ...camposDocumento,
  tipoDte: tipoDteSchema,
  montoNeto: montoSchema.default(0),
  glosa: textoOpcional(300),
});

export const resultadoFila = z.object({
  indice: z.number().int().describe("Posición de la fila en la entrada (desde 0)."),
  estado: z.enum(["nuevo", "duplicado", "error"]),
  mensaje: z.string().nullable(),
});

