import { z } from "zod";

import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";

/** Membresía de un supervisor del tenant (gobierno de acceso, no se acota por filas). */
export async function supervisorDe(ctx: Contexto, membershipId: string) {
  const m = await ctx.db.membership.findUnique({ where: { id: membershipId } });
  if (!m) throw noEncontrado("El usuario");
  // El alcance por filas de este brief es solo del rol base supervisor (§16.4). Otros roles no se
  // acotan por instalación; cliente y trabajador se suman con sus portales (fase 3).
  if (m.rol !== "supervisor") throw reglaDeNegocio("El alcance por instalación es solo del supervisor.");
  return m;
}

/**
 * Gobierno del alcance (§16.4): quién puede fijar el alcance de un supervisor. Además del permiso
 * `users.manage` de la capacidad, exige ser owner o admin; nadie cambia su propio alcance ni asigna
 * instalaciones fuera del suyo (owner/admin tienen `alcance` null = todo). Evita la escalada.
 */
export function exigirGobiernoDeAlcance(
  ctx: Contexto,
  membership: { userId: string },
  instalacionIds: readonly string[],
) {
  if (ctx.rol !== "owner" && ctx.rol !== "admin")
    throw prohibido("Solo un owner o admin cambia el alcance de un supervisor.");
  if (ctx.usuario && membership.userId === ctx.usuario.id)
    throw prohibido("No puedes cambiar tu propio alcance.");
  if (ctx.alcance && instalacionIds.some((id) => !ctx.alcance?.instalaciones.includes(id)))
    throw prohibido("No puedes dar más alcance que el propio.");
}

/** Ids de instalaciones a cargo de una membresía. */
export async function idsDe(ctx: Contexto, membershipId: string): Promise<string[]> {
  const filas = await ctx.db.supervisorInstalacion.findMany({
    where: { membershipId },
    select: { instalacionId: true },
  });
  return filas.map((f) => f.instalacionId);
}

/** Instalaciones (id y nombre) de un conjunto de ids, ordenadas por nombre. */
export async function nombresDe(ctx: Contexto, ids: string[]) {
  if (!ids.length) return [];
  const filas = await ctx.db.instalacion.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return filas.map((f) => ({ id: f.id, nombre: f.nombre }));
}

const instalacionRef = z.object({ id: z.string(), nombre: z.string() });
export const asignacionSchema = z.object({
  membershipId: z.string(),
  instalaciones: z.array(instalacionRef),
});
export const entrada = z.object({
  membershipId: uuidSchema,
  instalacionIds: z.array(uuidSchema).min(1).max(500),
});
