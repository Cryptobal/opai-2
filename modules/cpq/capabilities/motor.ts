import { defineCapability, ErrorCapacidad } from "@opai/capabilities";
import { calcular, resultadoSinCostos } from "../domain/motor";
import { motorInputSchema, motorOutputSchema } from "./motor-esquemas";
import { PERMISO_COSTOS, PERMISO_READ } from "./permisos";

export const motorSimular = defineCapability({
  id: "cpq.motor.simular",
  descripcion: "Simula una versión de cotización recibida en el cuerpo, sin leer ni guardar datos. Devuelve cálculo y traza solo con permiso de costos; los demás reciben venta, dotación y advertencias públicas.",
  permiso: PERMISO_READ,
  input: motorInputSchema,
  output: motorOutputSchema,
  efecto: "lectura",
  sinDb: true,
  dryRun: false,
  async handler(ctx, input) {
    try {
      const resultado = calcular(input.version, input.modelo, input.parametros);
      return ctx.autorizar(PERMISO_COSTOS) ? resultado : resultadoSinCostos(resultado);
    } catch (error) {
      // Los errores del dominio nunca adjuntan input, operandos ni montos.
      throw new ErrorCapacidad("INVALID_INPUT", error instanceof Error ? error.message : "Modelo de cálculo inválido");
    }
  },
});
