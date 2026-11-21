import { randomUUID } from "node:crypto";

import type { Contexto } from "../src/types";

export async function viewerTrabajador(
  ctx: Contexto,
  email: string,
  portales: string[] = ["trabajador"],
) {
  const userId = randomUUID();
  await ctx.db.user.create({ data: { id: userId, name: "U", email } });
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