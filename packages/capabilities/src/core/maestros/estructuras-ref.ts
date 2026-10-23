import { z } from "zod";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { diaSchema } from "./comun";
import { itemInput, NIVELES } from "./estructuras-vista";

export const DIA_MS = 86_400_000;

export const entrada = z.object({
  nivel: z.enum(NIVELES),
  cargoId: uuidSchema.optional(),
  puestoId: uuidSchema.optional(),
  personaId: uuidSchema.optional(),
  sueldoBase: z.number().int().min(0).describe("CLP entero."),
  colacion: z.number().int().min(0).default(0),
  movilizacion: z.number().int().min(0).default(0),
  gratificacion: z.enum(["legal_25", "monto_fijo", "ninguna"]).default("legal_25"),
  gratificacionMonto: z.number().int().min(0).nullable().optional(),
  vigenteDesde: diaSchema,
  motivo: z.string().trim().min(5).max(500).optional().describe("Obligatorio en nivel persona."),
  items: z.array(itemInput).max(30).default([]),
});

type Entrada = z.output<typeof entrada>;

/** Valida que venga exactamente la referencia del nivel y que exista. */
export async function referencia(ctx: Contexto, e: Entrada) {
  const refs = { cargo: e.cargoId, puesto: e.puestoId, persona: e.personaId };
  const otras = Object.entries(refs).filter(([n, v]) => n !== e.nivel && v);
  const id = refs[e.nivel];
  if (!id || otras.length) throw reglaDeNegocio(`Nivel "${e.nivel}": envía solo ${e.nivel}Id.`);
  const existe =
    e.nivel === "cargo"
      ? await ctx.db.cargo.findUnique({ where: { id } })
      : e.nivel === "puesto"
        ? await ctx.db.puesto.findUnique({ where: { id } })
        : await ctx.db.persona.findUnique({ where: { id } });
  if (!existe) throw noEncontrado(`La referencia de nivel ${e.nivel}`);
  if (e.nivel === "persona" && !e.motivo)
    throw reglaDeNegocio("Una excepción por persona exige motivo.");
  if (e.gratificacion === "monto_fijo" && e.gratificacionMonto == null) {
    throw reglaDeNegocio("Gratificación de monto fijo: falta el monto.");
  }
  return {
    id,
    campo: `${e.nivel}Id` as const,
    refs: {
      cargoId: e.nivel === "cargo" ? id : null,
      puestoId: e.nivel === "puesto" ? id : null,
      personaId: e.nivel === "persona" ? id : null,
    },
  };
}
