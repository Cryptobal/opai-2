import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { motorOutputSchema } from "./motor-esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";
import { proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { uuidSchema } from "./esquemas";

export const cotizacionesCalcular = defineCapability({
  id: "cpq.cotizaciones.calcular",
  descripcion:
    "Recalcula en servidor la versión editable de una cotización con el motor CPQ; persiste venta y huellas en borrador.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, version: z.number().int().min(1).optional() }),
  output: motorOutputSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    const r = await recalcularVersion(ctx, input.id, input.version, !dryRun);
    if (!r) throw noEncontrado("La versión");
    return proyectarCalculo(ctx, r);
  },
});
