import { z } from "zod";

import { validarEstructuraCompleta } from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion, dondePersona, dondePuesto } from "./alcance";
import { diaSchema } from "./comun";
import { itemInput, NIVELES } from "./estructuras-vista";

export const DIA_MS = 86_400_000;

export const entrada = z.object({
  nivel: z.enum(NIVELES),
  cargoId: uuidSchema.optional(),
  puestoId: uuidSchema.optional(),
  personaId: uuidSchema.optional(),
  instalacionId: uuidSchema.optional(),
  sueldoBase: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional()
    .describe("CLP entero. Obligatorio para toda capa nueva."),
  colacion: z.number().int().min(0).nullable().optional(),
  movilizacion: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional()
    .describe("CLP entero, definido explícitamente en capas nuevas."),
  gratificacion: z
    .enum(["legal_25", "monto_fijo", "ninguna"])
    .nullable()
    .optional()
    .describe("Obligatoria para capas nuevas."),
  gratificacionMonto: z.number().int().min(0).nullable().optional(),
  vigenteDesde: diaSchema,
  motivo: z.string().trim().min(5).max(500).optional().describe("Obligatorio en nivel persona."),
  items: z.array(itemInput).max(30).default([]),
});

type Entrada = z.output<typeof entrada>;

/** Valida que venga exactamente la referencia del nivel y que exista. */
export async function referencia(ctx: Contexto, e: Entrada) {
  const refs = { cargo: e.cargoId, puesto: e.puestoId, persona: e.personaId, instalacion: e.instalacionId };
  const otras = Object.entries(refs).filter(([n, v]) => n !== e.nivel && v);
  const id = refs[e.nivel];
  if (!id || otras.length) throw reglaDeNegocio(`Nivel "${e.nivel}": envía solo ${e.nivel}Id.`);
  // El catálogo de cargos es del tenant (sin alcance); puesto y persona se acotan por instalación,
  // igual que en lectura (`dondeEstructura`): fuera de alcance = no encontrado (ADR-022, §16.4).
  const existe =
    e.nivel === "cargo"
      ? await ctx.db.cargo.findUnique({ where: { id } })
      : e.nivel === "puesto"
        ? await ctx.db.puesto.findFirst({ where: { id, AND: [dondePuesto(ctx)] } })
        : e.nivel === "instalacion"
          ? await ctx.db.instalacion.findFirst({ where: { id, AND: [dondeInstalacion(ctx)] } })
          : await ctx.db.persona.findFirst({ where: { id, AND: [dondePersona(ctx)] } });
  if (!existe) throw noEncontrado(`La referencia de nivel ${e.nivel}`);
  if (e.nivel !== "cargo") {
    try {
      validarEstructuraCompleta({ ...conceptosDe(e), gratificacionMonto: e.gratificacionMonto ?? null });
    } catch (error) {
      throw reglaDeNegocio(error instanceof Error ? error.message : "Estructura incompleta.");
    }
  }
  if (e.nivel === "persona" && !e.motivo)
    throw reglaDeNegocio("Una excepción por persona exige motivo.");
  if (e.nivel === "cargo" && e.sueldoBase == null)
    throw reglaDeNegocio("La estructura de un cargo exige sueldo base.");
  const define =
    [e.sueldoBase, e.colacion, e.movilizacion, e.gratificacion].some((v) => v != null) ||
    e.items.length > 0;
  if (!define) throw reglaDeNegocio("La estructura no define ningún concepto.");
  if (e.gratificacion === "monto_fijo" && e.gratificacionMonto == null) {
    throw reglaDeNegocio("Gratificación de monto fijo: falta el monto.");
  }
  return {
    id,
    conceptos: conceptosDe(e),
    campo: `${e.nivel}Id` as const,
    refs: {
      cargoId: e.nivel === "cargo" ? id : null,
      puestoId: e.nivel === "puesto" ? id : null,
      personaId: e.nivel === "persona" ? id : null,
      instalacionId: e.nivel === "instalacion" ? id : null,
    },
  };
}

/** Conceptos a guardar: el cargo define todos (con valores por defecto); los demás, solo los enviados. */
export function conceptosDe(e: Entrada) {
  const cargo = e.nivel === "cargo";
  return {
    sueldoBase: e.sueldoBase ?? null,
    colacion: e.colacion ?? (cargo ? 0 : null),
    movilizacion: e.movilizacion ?? (cargo ? 0 : null),
    gratificacion: e.gratificacion ?? (cargo ? ("legal_25" as const) : null),
  };
}
