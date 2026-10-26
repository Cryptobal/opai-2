import { z } from "zod";

import { CLASES_PATRON, diasPorSemana, resumenPatron } from "@opai/domain";

import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { otroQue } from "./comun";

export const patronSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  clase: z.string().describe('"ciclico" (se repite cada N días) o "semanal" (días fijos).'),
  diasTrabajo: z.number(),
  diasDescanso: z.number(),
  diasSemana: z.array(z.number()).describe("Días 1–7 (lunes a domingo) de los patrones semanales."),
  resumen: z.string().describe('Texto legible para la lista y la ficha: "Ciclo de 8 · 4 de trabajo, 4 de descanso".'),
  diasPorSemana: z.number().describe("Días trabajados por semana (proporción del ciclo o conteo)."),
  deFabrica: z.boolean(),
  activo: z.boolean(),
  orden: z.number(),
  puestosActivos: z.number(),
});

export type FilaPatron = {
  id: string;
  nombre: string;
  clase?: string | null;
  diasTrabajo: number;
  diasDescanso: number;
  diasSemana?: number[] | null;
  deFabrica?: boolean | null;
  activo?: boolean | null;
  orden?: number | null;
};

export function vistaPatron(p: FilaPatron, puestosActivos = 0) {
  const clase = p.clase === "semanal" ? "semanal" : "ciclico";
  const def = {
    nombre: p.nombre,
    clase,
    diasTrabajo: p.diasTrabajo,
    diasDescanso: p.diasDescanso,
    diasSemana: p.diasSemana ?? [],
  } as const;
  return {
    id: p.id,
    nombre: p.nombre,
    clase,
    diasTrabajo: p.diasTrabajo,
    diasDescanso: p.diasDescanso,
    diasSemana: [...(p.diasSemana ?? [])],
    resumen: resumenPatron(def),
    diasPorSemana: Math.round(diasPorSemana(def) * 10) / 10,
    deFabrica: p.deFabrica ?? false,
    activo: p.activo ?? true,
    orden: p.orden ?? 0,
    puestosActivos,
  };
}

export const DUPLICADO_PATRON = "Ya existe un patrón de turno con ese nombre.";

export const camposPatron = {
  nombre: z.string().trim().min(1).max(40).describe('Nombre visible, p. ej. "4×4" o "5×2".'),
  clase: z.enum(CLASES_PATRON).optional(),
  diasTrabajo: z
    .number()
    .int()
    .min(1)
    .max(28)
    .optional()
    .describe("Cíclicos: días de trabajo del ciclo. En los semanales se derivan de los días marcados."),
  diasDescanso: z.number().int().min(1).max(28).optional().describe("Cíclicos: días de descanso."),
  diasSemana: z
    .array(z.number().int().min(1).max(7))
    .max(7)
    .optional()
    .describe("Días 1–7 (lunes a domingo); solo para los patrones semanales."),
  orden: z.number().int().min(0).max(999).optional(),
};

export async function patronDe(ctx: Contexto, id: string) {
  const p = await ctx.db.patronTurno.findUnique({ where: { id } });
  if (!p) throw noEncontrado("El patrón de turno");
  return p;
}

export async function conteoPuestosPatron(ctx: Contexto, patronId: string) {
  return ctx.db.puesto.count({ where: { patronId, estado: "activo" } });
}

export async function nombrePatronLibre(ctx: Contexto, nombre?: string, excepto?: string) {
  if (nombre && (await ctx.db.patronTurno.findFirst({ where: { nombre, ...otroQue(excepto) } })))
    throw conflicto(DUPLICADO_PATRON);
}

/** Todos los puestos que usan el patrón (activos o no): guardan su ciclo y sus horas. */
export async function puestosConPatron(db: Pick<Contexto["db"], "puesto">, patronId: string) {
  return db.puesto.count({ where: { patronId } });
}

type Estructura = { clase?: string | undefined; diasTrabajo?: number | undefined; diasDescanso?: number | undefined; diasSemana?: number[] | undefined };

/**
 * Estructura coherente del patrón. Semanal: los días marcados (1–7, sin repetir, al menos uno y
 * a lo más seis) mandan, y trabajo × descanso se derivan de ellos. Cíclico: trabajo y descanso
 * obligatorios, sin días de la semana.
 */
export function estructuraPatron(e: Estructura) {
  const clase = e.clase === "semanal" ? "semanal" : "ciclico";
  const dias = e.diasSemana ?? [];
  if (clase === "semanal") {
    if (dias.length === 0)
      throw reglaDeNegocio("Un patrón semanal necesita al menos un día de la semana.");
    if (new Set(dias).size !== dias.length)
      throw reglaDeNegocio("Los días de la semana del patrón no se pueden repetir.");
    if (dias.length > 6) throw reglaDeNegocio("Un patrón semanal necesita al menos un día de descanso.");
    if (
      (e.diasTrabajo !== undefined && e.diasTrabajo !== dias.length) ||
      (e.diasDescanso !== undefined && e.diasDescanso !== 7 - dias.length)
    )
      throw reglaDeNegocio(
        `Con ${dias.length} día(s) marcados el patrón semanal es ${dias.length}×${7 - dias.length}.`,
      );
    const diasSemana = [...dias].sort((a, b) => a - b);
    return { clase, diasTrabajo: dias.length, diasDescanso: 7 - dias.length, diasSemana };
  }
  if (dias.length > 0)
    throw reglaDeNegocio("Un patrón cíclico no usa días de la semana: elige la clase semanal.");
  if (!e.diasTrabajo || !e.diasDescanso)
    throw reglaDeNegocio("Un patrón cíclico necesita días de trabajo y de descanso.");
  return { clase, diasTrabajo: e.diasTrabajo, diasDescanso: e.diasDescanso, diasSemana: [] };
}

/** ¿Cambia la forma del ciclo? (clase, trabajo, descanso o días de la semana). */
export function cambiaEstructura(
  actual: { clase: string; diasTrabajo: number; diasDescanso: number; diasSemana: number[] },
  nueva: { clase: string; diasTrabajo: number; diasDescanso: number; diasSemana: number[] },
) {
  return (
    actual.clase !== nueva.clase ||
    actual.diasTrabajo !== nueva.diasTrabajo ||
    actual.diasDescanso !== nueva.diasDescanso ||
    actual.diasSemana.join(",") !== nueva.diasSemana.join(",")
  );
}

export const EN_USO =
  "El patrón tiene puestos: su clase, ciclo y días no se pueden cambiar. Crea un patrón nuevo y cámbialo en los puestos.";
