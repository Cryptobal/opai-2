import { z } from "zod";

import { conflicto, noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { dondePuesto } from "./alcance";
import { otroQue, textoOpcional } from "./comun";

export const funcionSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  vertical: z.string().nullable().describe("Vertical a la que aplica (seguridad, aseo…); null = todas."),
  activo: z.boolean(),
  orden: z.number(),
  puestosActivos: z.number(),
});

export type FilaFuncion = {
  id: string;
  nombre: string;
  vertical?: string | null;
  activo?: boolean | null;
  orden?: number | null;
};

export const vistaFuncion = (f: FilaFuncion, puestosActivos = 0) => ({
  id: f.id,
  nombre: f.nombre,
  vertical: f.vertical ?? null,
  activo: f.activo ?? true,
  orden: f.orden ?? 0,
  puestosActivos,
});

export const DUPLICADO_FUNCION = "Ya existe una función con ese nombre.";

export const camposFuncion = {
  nombre: z.string().trim().min(2).max(60).describe('Nombre de la función, p. ej. "Guardia" o "Supervisor".'),
  vertical: textoOpcional(40),
  orden: z.number().int().min(0).max(999).optional(),
};

export async function funcionDe(ctx: Contexto, id: string) {
  const f = await ctx.db.funcionPuesto.findUnique({ where: { id } });
  if (!f) throw noEncontrado("La función");
  return f;
}

// El conteo es solo informativo (no decide nada), pero igual respeta el alcance por filas del
// supervisor (ADR-022, Brief 07c B3): fuera de las instalaciones a cargo, el puesto no cuenta.
export async function conteoPuestosFuncion(ctx: Contexto, funcionId: string) {
  return ctx.db.puesto.count({
    where: { funcionId, estado: "activo", AND: [dondePuesto(ctx)] },
  });
}

export async function nombreFuncionLibre(ctx: Contexto, nombre?: string, excepto?: string) {
  if (nombre && (await ctx.db.funcionPuesto.findFirst({ where: { nombre, ...otroQue(excepto) } })))
    throw conflicto(DUPLICADO_FUNCION);
}
