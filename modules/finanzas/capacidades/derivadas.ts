import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { celdaSchema, semanaSchema } from "./esquemas";
import { PERMISO_VER } from "./permisos";
import { lunesDe } from "../domain";
import { derivadasBanco } from "./derivadas/banco";
import { derivadasDteSemana } from "./derivadas/dte";
import { derivadasNomina } from "./derivadas/nomina";
import { hoyIso } from "./util";


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
    "Lista las celdas derivadas de hechos externos (DTE, banco conciliado, nómina) para una semana del flujo. " +
    "La fuente DTE aporta comprometido desde ventas; banco desde conciliación (CAR-97); nómina, las remuneraciones proyectadas (CAR-344).",
  permiso: PERMISO_VER,
  input: z.object({ semana: semanaSchema.optional() }),
  output: outputSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input): Promise<z.infer<typeof outputSchema>> {
    const semana = input.semana ?? lunesDe(hoyIso());
    const [banco, dte, nomina] = await Promise.all([
      derivadasBanco(ctx, semana),
      derivadasDteSemana(ctx, semana),
      derivadasNomina(ctx, semana),
    ]);
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
          disponible: banco.length > 0,
          descripcion: "Capa real desde conciliación bancaria (CAR-97).",
          celdas: banco,
        },
        {
          id: "nomina",
          nombre: "Nómina",
          disponible: nomina.length > 0,
          descripcion: "Sueldos, anticipo de quincena y Previred proyectados desde Nómina (CAR-344).",
          celdas: nomina,
        },
      ],
    };
  },
});
