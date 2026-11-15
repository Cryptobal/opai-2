import { equipoDe, personaDelUsuario } from "../core/jefatura";
import { dondePersona } from "../core/maestros/alcance";
import type { Contexto } from "../types";
import { PERMISOS_DESEMPENO } from "./comun";

export type Visibilidad = {
  /** Ficha de Persona de quien consulta, si la tiene vinculada. */
  propia: string | null;
  /** Ve a toda la empresa (gerencia y quien administra el módulo). */
  todos: boolean;
  /** Personas a su cargo según la jefatura de cada cargo (vacío si ve a todos). */
  equipo: Set<string>;
};

/** A quién puede ver quien consulta: a todos, o a sí mismo y a las personas a su cargo (ADR-094 §9). */
export async function visibilidadDe(ctx: Contexto): Promise<Visibilidad> {
  const propia = await personaDelUsuario(ctx);
  if (ctx.autorizar(PERMISOS_DESEMPENO.resultadosVerTodos)) {
    return { propia, todos: true, equipo: new Set() };
  }
  const equipo = propia ? (await equipoDe(ctx, propia)).ids : new Set<string>();
  return { propia, todos: false, equipo };
}

/**
 * De `ids`, las personas cuyo resultado puede ver quien consulta, sin contar la propia. El alcance
 * por filas (ADR-022) se aplica siempre: ni la jefatura ni el permiso de ver a todos lo amplían.
 */
export async function visiblesEntre(
  ctx: Contexto,
  vis: Visibilidad,
  ids: readonly string[],
): Promise<Set<string>> {
  const candidatas = ids.filter((id) => id !== vis.propia && (vis.todos || vis.equipo.has(id)));
  if (ctx.alcance === null || candidatas.length === 0) return new Set(candidatas);
  const enAlcance = await ctx.db.persona.findMany({
    where: { id: { in: candidatas }, ...dondePersona(ctx) },
    select: { id: true },
  });
  return new Set(enAlcance.map((p) => p.id));
}
