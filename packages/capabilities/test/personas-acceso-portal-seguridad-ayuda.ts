import { randomUUID } from "node:crypto";

import type { Rol } from "@opai/domain";

import type { EventoPublicado } from "../src/eventos/consumidores";
import { contextoDePrueba } from "../src/testing/contexto";
import type { Contexto } from "../src/types";
import { semillaTenant } from "./semilla";

export async function viewerTrabajador(
  ctx: Contexto,
  email: string,
  portales: string[] = ["trabajador"],
  emailVerified = true,
) {
  const userId = randomUUID();
  await ctx.db.user.create({ data: { id: userId, name: "U", email, emailVerified } });
  await ctx.db.membership.create({
    data: { tenantId: ctx.tenantId, userId, rol: "viewer", portales, estado: "activa" },
  });
  return userId;
}

export async function personaActiva(
  ctx: Contexto,
  o: { id?: string; rut: string; email?: string | null; usuarioId?: string | null },
) {
  const id = o.id ?? randomUUID();
  await ctx.db.persona.create({
    data: {
      tenantId: ctx.tenantId,
      id,
      nombres: "T",
      apellidos: "P",
      rut: o.rut,
      estado: "activo",
      emailLaboral: o.email ?? null,
      ...(o.usuarioId !== undefined ? { usuarioId: o.usuarioId } : {}),
    },
  });
  return id;
}

export async function usuarioActor(ctx: Contexto, rol: Rol) {
  const id = randomUUID();
  await ctx.db.user.create({
    data: { id, name: "Actor", email: `actor-${id.slice(0, 8)}@prueba.cl`, emailVerified: true },
  });
  await ctx.db.membership.create({
    data: { tenantId: ctx.tenantId, userId: id, rol, portales: ["erp"], estado: "activa" },
  });
  return id;
}

export function eventoPrueba(
  tipo: string,
  o: Partial<EventoPublicado> & { payload?: unknown },
): EventoPublicado {
  const { payload, ...rest } = o;
  return {
    id: randomUUID(),
    tipo,
    entidadTipo: null,
    entidadId: null,
    payload: payload ?? {},
    actorTipo: "system",
    actorId: null,
    viaUserId: null,
    createdAt: new Date(),
    ...rest,
  };
}

/** Despacho asíncrono: ctx de sistema sin usersManage (como medidor.ts). */
export function contextoDespachoSistema(modulosActivos: readonly string[] = ["portal_trabajador"]) {
  return contextoDePrueba({
    usuario: null,
    actor: { tipo: "system" },
    rol: null,
    conTenant: true,
    modulosActivos,
    semilla: semillaTenant(),
  });
}