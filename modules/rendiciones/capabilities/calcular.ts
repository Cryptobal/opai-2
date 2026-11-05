import { defineCapability } from "@opai/capabilities";

import { PERMISO_RENDIR } from "./permisos";
import { actorId } from "./util";
import { calcularViaje, calculoSchema, viajeSchema } from "./viaje";

export const kilometrajeCalcular = defineCapability({
  id: "rendiciones.kilometraje.calcular",
  descripcion:
    "Calcula, sin guardar nada, cuánto se reembolsa por un viaje: mide la distancia entre origen y destino (por ruta, o en línea recta si no hay ruta) y aplica el método de kilometraje de la empresa. Devuelve km, el origen de la distancia, el monto y el desglose; es la misma fórmula que se guarda al rendir.",
  permiso: PERMISO_RENDIR,
  input: viajeSchema,
  output: calculoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    actorId(ctx);
    return (await calcularViaje(ctx, input)).calculo;
  },
});
