import { createHash } from "node:crypto";

import type { Contexto } from "@opai/capabilities";

import { usuarioId } from "./usuario";

const VIGENCIA_MS = 5 * 60_000;
const huella = (sesionId: string) => createHash("sha256").update(sesionId).digest("hex");

/** Ata la sesión de vida que acaba de abrir el proveedor a la empresa y al usuario que la abrió. */
export async function registrarSesionVida(ctx: Contexto, sesionId: string): Promise<void> {
  await ctx.db.sesionVida.create({ data: { tenantId: ctx.tenantId, sesionHash: huella(sesionId), actorId: usuarioId(ctx) } });
}

/**
 * Consume la sesión, una sola vez: debe ser de esta empresa, de quien la abrió y reciente. Una sesión ajena,
 * repetida o vencida no sirve (evita reusar una prueba de vida para varias marcas o entre empresas).
 */
export async function consumirSesionVida(ctx: Contexto, sesionId: string): Promise<boolean> {
  const r = await ctx.db.sesionVida.updateMany({
    where: { sesionHash: huella(sesionId), actorId: usuarioId(ctx), usadaEn: null, createdAt: { gte: new Date(Date.now() - VIGENCIA_MS) } },
    data: { usadaEn: new Date() },
  });
  return r.count === 1;
}
