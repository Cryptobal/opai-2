import { rangoDelPeriodo, type DefinicionPropio } from "@opai/domain";
import { z } from "zod";

import type { Contexto } from "../types";
import type { Meses } from "./comun";
import { medirPropio } from "./propios-comun";

/** Con menos sujetos, mínimo y máximo serían el valor de una persona con nombre y apellido. */
const MINIMO_PARA_RESUMIR = 3;

export const previaSchema = z
  .object({
    periodo: z.string(),
    sujetos: z.number().describe("Personas o usuarios con hechos en el mes."),
    minimo: z.number().nullable(),
    maximo: z.number().nullable(),
    promedio: z.number().nullable().describe("null si hay menos de 3 sujetos: no se resume."),
  })
  .describe("Resultado del mes en curso con los datos reales de la empresa, sin nombres.");

/**
 * Vista previa con datos reales del mes en curso. Es agregada y, con menos de tres sujetos, solo
 * dice cuántos hay: así no se puede leer por aquí el valor de una persona.
 */
export async function vistaPreviaDe(
  ctx: Contexto,
  definicion: DefinicionPropio,
  meses: Meses,
): Promise<z.infer<typeof previaSchema>> {
  const medido = await medirPropio(ctx, definicion, rangoDelPeriodo(meses.actual, meses.zona));
  const valores = [...medido.values()].filter((v): v is number => v !== null);
  const resumir = valores.length >= MINIMO_PARA_RESUMIR;
  return {
    periodo: meses.actual,
    sujetos: valores.length,
    minimo: resumir ? Math.min(...valores) : null,
    maximo: resumir ? Math.max(...valores) : null,
    promedio: resumir
      ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10
      : null,
  };
}
