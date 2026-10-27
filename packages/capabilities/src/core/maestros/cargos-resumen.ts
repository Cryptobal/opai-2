import { z } from "zod";

import { dia } from "./comun";

export const resumenSueldoSchema = z
  .object({
    sueldoBase: z.number().nullable(),
    colacion: z.number().nullable(),
    movilizacion: z.number().nullable(),
    gratificacion: z.string().nullable(),
    vigenteDesde: z.string(),
    sensible: z.boolean().describe("true: montos ocultos por falta del permiso sensible."),
  })
  .nullable()
  .describe("Versión vigente hoy de la estructura del cargo (null si no tiene).");

type FilaEstructuraCargo = {
  sueldoBase: number | null;
  colacion: number | null;
  movilizacion: number | null;
  gratificacion: string | null;
  vigenteDesde: Date | null;
};

/**
 * Resumen de la estructura vigente de un cargo. `oculto` oculta los montos cuando el cargo es
 * sensible y el actor no tiene el permiso sensible (ADR-022); el nivel aquí siempre es «cargo», así
 * que basta el flag del cargo (sin consultar su cargo otra vez, a diferencia de `ocultarMontos`).
 */
export function resumenSueldoDe(
  estructura: FilaEstructuraCargo | undefined,
  oculto: boolean,
): z.output<typeof resumenSueldoSchema> {
  if (!estructura) return null;
  const m = (v: number | null) => (oculto ? null : v);
  return {
    sueldoBase: m(estructura.sueldoBase),
    colacion: m(estructura.colacion),
    movilizacion: m(estructura.movilizacion),
    gratificacion: oculto ? null : estructura.gratificacion,
    vigenteDesde: dia(estructura.vigenteDesde) ?? "",
    sensible: oculto,
  };
}
