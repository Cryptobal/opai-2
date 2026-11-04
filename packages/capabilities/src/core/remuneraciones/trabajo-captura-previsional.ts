import { z } from "zod";

import { defineTrabajo } from "../../trabajos/registro";
import { capturarPrevisional } from "./previsional-captura";

export const trabajoCapturaPrevisional = defineTrabajo({
  tipo: "core.remuneraciones.captura_previsional",
  descripcion:
    "Captura mensual de ingreso mínimo, topes, AFP, SIS y cesantía desde Previred: renueva, propone un cambio o deja el aviso.",
  payload: z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  async handler(ctx, { dia }, signal) {
    await capturarPrevisional(ctx, { dia, signal });
  },
});
