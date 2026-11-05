import { z } from "zod";

import { ufDesdeTexto } from "@opai/domain";

import { reglaDeNegocio } from "../../../errores";
import { diaSchema } from "../../maestros/comun";
import { formaSchema, monedaSchema, unidadSchema } from "./esquemas";

const montoTexto = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .describe("CLP en pesos enteros («250000») o UF con hasta 4 decimales («2,5»).");

export const condicionInput = z.object({
  moneda: monedaSchema.default("UF").describe("UF por defecto; CLP también se permite."),
  forma: formaSchema.default("fijo"),
  unidad: unidadSchema
    .nullable()
    .optional()
    .describe("Obligatoria si la forma es por_unidad: qué se cuenta cada mes."),
  precio: montoTexto.describe("Precio mensual (fijo) o por unidad (por_unidad)."),
  minimoMensual: montoTexto
    .nullable()
    .optional()
    .describe("Mínimo mensual; después, el descuento."),
  cobroDesde: diaSchema.nullable().optional().describe("Día aaaa-mm-dd desde el que se cobra."),
  pruebaHasta: diaSchema.nullable().optional().describe("Último día de prueba (aaaa-mm-dd)."),
  pasaACobro: z
    .boolean()
    .default(false)
    .describe(
      "Al vencer la prueba: true empieza a cobrarse al día siguiente; false, solo lectura.",
    ),
  descuentoPorcentaje: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("0 a 100, hasta 4 decimales."),
  nota: z.string().trim().max(500).nullable().optional(),
});

/** Monto escrito por una persona a entero: pesos o UF × 10.000. */
export function montoEntero(moneda: "CLP" | "UF", texto: string): number {
  const n =
    moneda === "UF"
      ? ufDesdeTexto(texto)
      : /^\d{1,3}(\.\d{3})+$|^\d+$/.test(texto)
        ? Number(texto.replace(/\./g, ""))
        : null;
  if (n === null || !Number.isSafeInteger(n) || n > 2_000_000_000)
    throw reglaDeNegocio(
      moneda === "UF"
        ? "Monto en UF inválido: usa hasta 4 decimales."
        : "Monto en CLP inválido: usa pesos enteros.",
    );
  return n;
}
