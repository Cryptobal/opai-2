import { z } from "zod";

import { conflicto, noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { otroQue, textoOpcional } from "./comun";

export const cargoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  clase: z.string(),
  sueldoSensible: z
    .boolean()
    .describe("Si es true, los montos solo los ve quien tiene permiso sensible."),
  activo: z.boolean(),
  orden: z.number(),
  personasVigentes: z.number(),
  puestosActivos: z.number(),
});

type FilaCargo = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  clase?: string | null;
  sueldoSensible?: boolean | null;
  activo?: boolean | null;
  orden?: number | null;
};
export const vista = (c: FilaCargo, conteos = { personasVigentes: 0, puestosActivos: 0 }) => ({
  id: c.id,
  nombre: c.nombre,
  descripcion: c.descripcion ?? null,
  clase: c.clase ?? "operativo",
  sueldoSensible: c.sueldoSensible ?? false,
  activo: c.activo ?? true,
  orden: c.orden ?? 0,
  ...conteos,
});

export const DUPLICADO = "Ya existe un cargo con ese nombre.";
export const campos = {
  nombre: z.string().trim().min(2).max(80),
  descripcion: textoOpcional(500),
  clase: z.enum(["operativo", "administrativo"]).optional(),
  sueldoSensible: z.boolean().optional(),
  orden: z.number().int().min(0).max(999).optional(),
};

export async function cargoDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cargo.findUnique({ where: { id } });
  if (!c) throw noEncontrado("El cargo");
  return c;
}

export async function conteos(ctx: Contexto, cargoId: string) {
  const [personasVigentes, puestosActivos] = await Promise.all([
    ctx.db.vinculoLaboral.count({ where: { cargoId, estado: "vigente" } }),
    ctx.db.puesto.count({ where: { cargoId, estado: "activo" } }),
  ]);
  return { personasVigentes, puestosActivos };
}

export async function nombreLibre(ctx: Contexto, nombre?: string, excepto?: string) {
  if (nombre && (await ctx.db.cargo.findFirst({ where: { nombre, ...otroQue(excepto) } })))
    throw conflicto(DUPLICADO);
}
