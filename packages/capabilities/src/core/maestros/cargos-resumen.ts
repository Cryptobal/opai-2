import { z } from "zod";

import type { Contexto } from "../../types";
import { aFecha, dia, hoy } from "./comun";
import { ocultarMontos } from "./estructuras-acceso";

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

/** Estructura vigente hoy de cada cargo (la de vigenteDesde más reciente ≤ hoy), con montos ocultos si es sensible. */
export async function sueldoVigentePorCargo(ctx: Contexto, cargoIds: string[]) {
  const filas = await ctx.db.estructuraSueldo.findMany({
    where: {
      nivel: "cargo",
      cargoId: { in: cargoIds },
      estado: "vigente",
      vigenteDesde: { lte: aFecha(hoy()) },
    },
    orderBy: { vigenteDesde: "desc" },
  });
  const r = new Map<string, z.output<typeof resumenSueldoSchema>>();
  for (const f of filas) {
    if (!f.cargoId || r.has(f.cargoId)) continue;
    const oculto = await ocultarMontos(ctx, f);
    const m = (v: number | null) => (oculto ? null : v);
    r.set(f.cargoId, {
      sueldoBase: m(f.sueldoBase),
      colacion: m(f.colacion),
      movilizacion: m(f.movilizacion),
      gratificacion: oculto ? null : f.gratificacion,
      vigenteDesde: dia(f.vigenteDesde) ?? "",
      sensible: oculto,
    });
  }
  return r;
}
