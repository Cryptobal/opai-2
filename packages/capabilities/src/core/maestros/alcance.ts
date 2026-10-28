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

/** Personas con vínculo vigente en una instalación a cargo (07b PR 3). */
export function dondePersona(ctx: Contexto): Prisma.PersonaWhereInput {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { vinculos: { some: { estado: "vigente", instalacionId: { in: [...ids] } } } } : {};
}

/** Si una entidad concreta está en el alcance del actor (para fichas y actividad por entidad). */
export async function entidadEnAlcance(ctx: Contexto, tipo: string, id: string): Promise<boolean> {
  const ids = instalacionesEnAlcance(ctx);
  if (!ids) return true;
  if (tipo === "instalacion") return ids.includes(id);
  if (tipo === "persona")
    return (await ctx.db.persona.count({ where: { id, AND: [dondePersona(ctx)] } })) > 0;
  if (tipo === "cuenta")
    return (await ctx.db.cuenta.count({ where: { id, ...dondeCuenta(ctx) } })) > 0;
  if (tipo === "puesto")
    return (await ctx.db.puesto.count({ where: { id, ...dondePuesto(ctx) } })) > 0;
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
