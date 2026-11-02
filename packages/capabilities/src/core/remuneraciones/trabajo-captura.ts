import { z } from "zod";

import { defineTrabajo } from "../../trabajos/registro";
import { capturarUfUtmSii } from "./sii-captura";

export const trabajoCapturaIndicadoresSii = defineTrabajo({
  tipo: "core.remuneraciones.captura_sii",
  descripcion: "Captura diaria UF/UTM desde el SII (plataforma, core.valores_publicados).",
  payload: z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  async handler(ctx, { dia }, signal) {
    await capturarUfUtmSii(ctx, { dia, signal });
  },
});
