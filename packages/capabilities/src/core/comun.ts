import { createHash, randomBytes } from "node:crypto";

import { prohibido, reglaDeNegocio } from "../errores";
import type { Contexto, Plataforma } from "../types";

/** Usuario humano responsable de la acción: el propio usuario o el responsable de la key. */
export function usuarioResponsable(ctx: Contexto): string {
  if (ctx.actor.tipo === "user") return ctx.actor.id;
  if (ctx.actor.tipo === "agent") return ctx.actor.viaUserId;
  throw reglaDeNegocio("Esta acción requiere un usuario responsable.");
}

export function requierePlataforma(ctx: Contexto): Plataforma {
  if (!ctx.plataforma) throw prohibido("Solo usuarios de plataforma.");
  return ctx.plataforma;
}

export async function tenantActual(ctx: Contexto) {
  const tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId } });
  if (!tenant) throw reglaDeNegocio("No hay una empresa seleccionada.");
  return tenant;
}

/** Token aleatorio de 32 bytes en base64url (enlaces de invitación). */
export function tokenAleatorio(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
