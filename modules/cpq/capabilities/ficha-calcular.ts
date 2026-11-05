import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { motorOutputSchema } from "./motor-esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";
import { proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { exigirBorrador, versionParaFicha } from "../persistencia/version";
import { uuidSchema } from "./esquemas";

export const cotizacionesCalcular = defineCapability({
  id: "cpq.cotizaciones.calcular",
  descripcion:
    "Recalcula en servidor la versión en borrador de una cotización con el motor CPQ y guarda venta y huellas; las versiones listas o enviadas están congeladas y no se recalculan.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, version: z.number().int().min(1).optional() }),
  output: motorOutputSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    // Fuera de borrador la versión está congelada: recalcular no guardaría nada (CAR-192).
    if (!dryRun) {
      const v = await versionParaFicha(ctx, input.id, input.version);
      if (!v) throw noEncontrado("La versión");
      exigirBorrador(v);
    }
    const r = await recalcularVersion(ctx, input.id, input.version, !dryRun);
    if (!r) throw noEncontrado("La versión");
    return proyectarCalculo(ctx, r);
  },
});
