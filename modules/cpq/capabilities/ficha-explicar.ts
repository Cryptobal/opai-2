import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { PERMISO_COSTOS } from "./permisos";
import { cotizacionDe } from "./util";
import { recalcularVersion } from "../persistencia/recalcular";
import { trazaLinea } from "../persistencia/ficha-meta";
import { uuidSchema } from "./esquemas";

export const cotizacionesExplicar = defineCapability({
  id: "cpq.cotizaciones.explicar",
  descripcion: "Devuelve la traza del motor para una línea o el total de la cotización.",
  permiso: PERMISO_COSTOS,
  input: z.object({ id: uuidSchema, lineaId: uuidSchema.optional() }),
  output: z.object({ traza: z.array(z.record(z.string(), z.unknown())) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await cotizacionDe(ctx, input.id);
    const r = await recalcularVersion(ctx, input.id, undefined, false);
    if (!r) throw noEncontrado("La versión");
    const traza = input.lineaId ? trazaLinea(r, input.lineaId) : r.traza;
    return { traza };
  },
});
