import type { Contexto } from "../types";

type WebIn = { endpoint: string; dispositivo?: string | undefined };
type NativaIn = { token: string; plataforma: "ios" | "android"; dispositivo?: string | undefined };

/** Crea o actualiza la fila por endpoint; si el token pertenecía a otro usuario, borra antes (no reasigna en silencio). */
export async function guardarSuscripcionWeb(ctx: Contexto, usuarioId: string, input: WebIn): Promise<void> {
  const clave = { tenantId_endpoint: { tenantId: ctx.tenantId, endpoint: input.endpoint } };
  const fila = await ctx.db.suscripcionPush.findUnique({ where: clave });
  if (fila && fila.usuarioId !== usuarioId) {
    await ctx.db.suscripcionPush.delete({ where: { id: fila.id } });
  } else if (fila) {
    await ctx.db.suscripcionPush.update({
      where: { id: fila.id },
      data: { dispositivo: input.dispositivo ?? null, tipo: "web" },
    });
    return;
  }
  await ctx.db.suscripcionPush.create({
    data: {
      tenantId: ctx.tenantId,
      usuarioId,
      tipo: "web",
      endpoint: input.endpoint,
      dispositivo: input.dispositivo ?? null,
    },
  });
}

/** Igual que web, por (tenant_id, token) con índice único completo (ON CONFLICT / upsert Prisma). */
export async function guardarSuscripcionNativa(ctx: Contexto, usuarioId: string, input: NativaIn): Promise<void> {
  const clave = { tenantId_token: { tenantId: ctx.tenantId, token: input.token } };
  const fila = await ctx.db.suscripcionPush.findUnique({ where: clave });
  if (fila && fila.usuarioId !== usuarioId) {
    await ctx.db.suscripcionPush.delete({ where: { id: fila.id } });
  } else if (fila) {
    await ctx.db.suscripcionPush.update({
      where: { id: fila.id },
      data: {
        plataforma: input.plataforma,
        dispositivo: input.dispositivo ?? null,
        tipo: "nativa",
      },
    });
    return;
  }
  await ctx.db.suscripcionPush.create({
    data: {
      tenantId: ctx.tenantId,
      usuarioId,
      tipo: "nativa",
      token: input.token,
      plataforma: input.plataforma,
      dispositivo: input.dispositivo ?? null,
    },
  });
}