import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { celdaSchema, semanaSchema } from "./esquemas";
import { PERMISO_VER } from "./permisos";
import { lunesDe } from "../domain";
import { derivadasDteSemana } from "./derivadas/dte";

const hoyIso = () => new Date().toISOString().slice(0, 10);

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
    "Lista las celdas derivadas de hechos externos (DTE, banco conciliado, nómina) para una semana. " +
    "La fuente DTE aporta comprometido desde ventas; banco y nómina siguen pendientes de sus PR.",
  permiso: PERMISO_VER,
  input: z.object({ semana: semanaSchema.optional() }),
  output: outputSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input): Promise<z.infer<typeof outputSchema>> => {
    const semana = input.semana ?? lunesDe(hoyIso());
    const dte = await derivadasDteSemana(ctx, semana);
    return {
      fuentes: [
        {
          id: "dte",
          nombre: "Documentos tributarios",
          disponible: dte.disponible,
          descripcion: dte.disponible
            ? "Comprometido desde facturas emitidas impagas (semana de emisión) y borradores."
            : "Cree una fila de ingreso con vínculo finanzas:ventas en el flujo para activar la capa DTE.",
          celdas: dte.celdas,
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
    };
  },
});
