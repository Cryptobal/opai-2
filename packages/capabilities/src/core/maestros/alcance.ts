// Alcance por filas del supervisor (ADR-022, Brief 07c B3). Construye los fragmentos `where` que
// acotan cada entidad a las instalaciones a cargo del actor. El filtro va SIEMPRE en la consulta,
// nunca en la UI. Si `ctx.alcance` es null (owner, admin, gerente) los fragmentos quedan vacíos y la
// capacidad ve todo el tenant; si es un supervisor sin instalaciones, el conjunto vacío no deja ver
// nada (denegar por defecto, §16.4).
import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";

/** Instalaciones a cargo del actor acotado, o null si ve todo el tenant. */
export function instalacionesEnAlcance(ctx: Contexto): readonly string[] | null {
  return ctx.alcance ? ctx.alcance.instalaciones : null;
}

export function dondeInstalacion(ctx: Contexto): Prisma.InstalacionWhereInput {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { id: { in: [...ids] } } : {};
}

export function dondeCuenta(ctx: Contexto): Prisma.CuentaWhereInput {
  const ids = instalacionesEnAlcance(ctx);
  // Una cuenta es visible si tiene al menos una instalación a cargo del supervisor.
  return ids ? { instalaciones: { some: { id: { in: [...ids] } } } } : {};
}

export function dondePuesto(ctx: Contexto): Prisma.PuestoWhereInput {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { instalacionId: { in: [...ids] } } : {};
}

export function dondeContacto(ctx: Contexto): Prisma.ContactoWhereInput {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { cuenta: { instalaciones: { some: { id: { in: [...ids] } } } } } : {};
}

/**
 * Alcance de personas: la persona es visible si tiene un vínculo laboral vigente en una instalación
 * a cargo. El Brief 07b agregará `instalacion_id` a `vinculos_laborales`; hasta entonces NO existe
 * una relación real persona ↔ instalación en el schema, así que el supervisor no ve ninguna persona
 * (denegar por defecto, §16.4). Al llegar 07b, este filtro pasa a usar el vínculo vigente. Ver
 * PR-BODY.md y el Brief 07b.
 */
export function dondePersona(ctx: Contexto): Prisma.PersonaWhereInput {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { id: { in: [] } } : {};
}

/** Si una entidad concreta está en el alcance del actor (para fichas y actividad por entidad). */
export async function entidadEnAlcance(ctx: Contexto, tipo: string, id: string): Promise<boolean> {
  const ids = instalacionesEnAlcance(ctx);
  if (!ids) return true;
  if (tipo === "instalacion") return ids.includes(id);
  if (tipo === "persona") return false; // relación real pendiente del Brief 07b
  if (tipo === "cuenta") return (await ctx.db.cuenta.count({ where: { id, ...dondeCuenta(ctx) } })) > 0;
  if (tipo === "puesto") return (await ctx.db.puesto.count({ where: { id, ...dondePuesto(ctx) } })) > 0;
  // cargo, documento y empresa no se acotan por instalación en este brief.
  return true;
}
