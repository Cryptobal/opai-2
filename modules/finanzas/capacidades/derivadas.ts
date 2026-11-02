import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { celdaSchema, semanaSchema } from "./esquemas";
import { PERMISO_VER } from "./permisos";

const fuenteSchema = z.object({
  id: z.enum(["dte", "banco", "nomina"]),
  nombre: z.string(),
  disponible: z.boolean(),
  descripcion: z.string(),
  celdas: z.array(celdaSchema),
});

const outputSchema = z.object({ fuentes: z.array(fuenteSchema) });

/**
 * Contrato de lectura para capas derivadas (ADR-026): DTE, banco y nómina alimentarán Comprometido/Real
 * al existir esos módulos. PR 2 solo declara la forma; devuelve arreglos vacíos.
 */
export const flujoDerivadasListar = defineCapability({
  id: "finanzas.derivadas.listar",
  descripcion:
    "Lista las celdas derivadas de hechos externos (DTE emitidos/recibidos, banco conciliado, nómina) " +
    "para una semana. Hoy devuelve fuentes vacías hasta que existan los adaptadores.",
  permiso: PERMISO_VER,
  input: z.object({ semana: semanaSchema.optional() }),
  output: outputSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (): Promise<z.infer<typeof outputSchema>> => ({
    fuentes: [
      {
        id: "dte",
        nombre: "Documentos tributarios",
        disponible: false,
        descripcion: "Comprometido y real desde facturación y compras cuando estén conectados al flujo.",
        celdas: [],
      },
      {
        id: "banco",
        nombre: "Movimientos bancarios",
        disponible: false,
        descripcion: "Real desde conciliación bancaria (CAR-97) cuando exista.",
        celdas: [],
      },
      {
        id: "nomina",
        nombre: "Nómina",
        disponible: false,
        descripcion: "Egresos de sueldos e imposiciones cuando el motor esté enlazado.",
        celdas: [],
      },
    ],
  }),
});
