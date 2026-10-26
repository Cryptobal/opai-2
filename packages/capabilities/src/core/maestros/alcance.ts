// Alcance por filas del supervisor (ADR-022, Brief 07c B3). Construye los fragmentos `where` que
// acotan cada entidad a las instalaciones a cargo del actor. El filtro va SIEMPRE en la consulta,
// nunca en la UI. Si `ctx.alcance` es null (owner, admin, gerente) los fragmentos quedan vacíos y la
// capacidad ve todo el tenant; si es un supervisor sin instalaciones, el conjunto vacío no deja ver
// nada (denegar por defecto, §16.4).
import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";
import { documentosEnAlcance } from "../documentos/alcance-doc";

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
 * Alcance de personas (CA-B3 parcial): la persona sería visible si tuviera un vínculo laboral
 * vigente en una instalación a cargo. El Brief 07b agregará `instalacion_id` a `vinculos_laborales`;
 * hasta entonces NO existe una relación real persona ↔ instalación en el schema, así que —decisión
 * del bot OPAI 2.0 con el mandato de Carlos (t365u, t366u)— el supervisor no ve ninguna persona
 * (negación total, denegar por defecto, §16.4). Al llegar 07b, este filtro pasa a usar el vínculo
 * vigente. Ver PR-BODY.md, el Brief 07b y §16.4.
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
  if (tipo === "documento") {
    // Un documento está en alcance solo si alguno de sus vínculos apunta a una entidad a cargo
    // (instalación, su cuenta o un puesto). Los documentos de empresa y los de personas quedan fuera.
    const permitidos = await documentosEnAlcance(ctx);
    return permitidos === null || permitidos.includes(id);
  }
  // El catálogo de cargos es del tenant y no se acota por instalación.
  if (tipo === "cargo") return true;
  // Empresa (tenant) y cualquier otro tipo: un actor acotado no lo ve (denegar por defecto, §16.4).
  return false;
}
