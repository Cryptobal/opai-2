import { z } from "zod";

import { defineTrabajo } from "../../trabajos/registro";
import { capturarUfUtmSii } from "./sii-captura";

export const trabajoCapturaIndicadoresSii = defineTrabajo({
  tipo: "core.remuneraciones.captura_sii",
  descripcion: "Captura diaria UF/UTM desde el SII (fuente primaria D4).",
  payload: z.object({}),
  periodicidad: "diaria",
  async handler(ctx) {
    await capturarUfUtmSii(ctx);
  },
});
