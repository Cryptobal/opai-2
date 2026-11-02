import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { celdaSchema, semanaSchema } from "./esquemas";
import { PERMISO_VER } from "./permisos";
import { derivadasBanco } from "./derivadas/banco";
import { derivadasDte } from "./derivadas/dte";
import { derivadasNomina } from "./derivadas/nomina";

const fuenteSchema = z.object({
  id: z.enum(["dte", "banco", "nomina"]),
  nombre: z.string(),
  disponible: z.boolean(),
  descripcion: z.string(),
  celdas: z.array(celdaSchema),
});

const outputSchema = z.object({ fuentes: z.array(fuenteSchema) });

export const flujoDerivadasListar = defineCapability({
  id: "finanzas.derivadas.listar",
  descripcion:
    "Lista las celdas derivadas de hechos externos (DTE, banco conciliado, nómina) para una semana del flujo.",
  permiso: PERMISO_VER,
  input: z.object({ semana: semanaSchema.optional() }),
  output: outputSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input): Promise<z.infer<typeof outputSchema>> {
    const [banco, dte, nomina] = await Promise.all([
      derivadasBanco(ctx, input.semana),
      derivadasDte(input.semana),
      derivadasNomina(input.semana),
    ]);
    return {
      fuentes: [
        {
          id: "dte",
          nombre: "Documentos tributarios",
          disponible: dte.length > 0,
          descripcion: "Comprometido y real desde facturación y compras.",
          celdas: dte,
        },
        {
          id: "banco",
          nombre: "Movimientos bancarios",
          disponible: banco.length > 0,
          descripcion: "Capa real desde conciliación bancaria (CAR-97).",
          celdas: banco,
        },
        {
          id: "nomina",
          nombre: "Nómina",
          disponible: false,
          descripcion: "Egresos de sueldos e imposiciones cuando el motor esté enlazado.",
          celdas: nomina,
        },
      ],
    };
  },
});
