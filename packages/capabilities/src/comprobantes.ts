import { randomBytes } from "node:crypto";

import type { TenantTx } from "@opai/db";

import type { Contexto } from "./types";

export type ComprobanteNuevo = {
  tipo: string;
  entidadTipo: string;
  entidadId: string;
  /** Huella del hecho: el hash del eslabón de la bitácora cuando hay `bitacoraSeq`. */
  hash: string;
  bitacoraSeq?: number;
  emitidoA?: string;
};

/**
 * Emite un comprobante verificable públicamente en `/verificar/<token>` (ADR-023). El token lleva
 * el slug del tenant para resolverlo sin consultas cross-tenant; no contiene datos personales.
 */
export async function emitirComprobante(
  ctx: Contexto,
  tx: TenantTx,
  c: ComprobanteNuevo,
): Promise<{ token: string; url: string }> {
  const tenant = await tx.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { slug: true },
  });
  if (!tenant) throw new Error("Empresa no encontrada.");
  const token = `${tenant.slug}.${randomBytes(18).toString("base64url")}`;
  await tx.comprobante.create({
    data: {
      tenantId: ctx.tenantId,
      tipo: c.tipo,
      entidadTipo: c.entidadTipo,
      entidadId: c.entidadId,
      hash: c.hash,
      token,
      bitacoraSeq: c.bitacoraSeq ?? null,
      emitidoA: c.emitidoA ?? null,
    },
  });
  return { token, url: `${ctx.servicios.urlBase}/verificar/${token}` };
}

/** "gard.Xyz…" → slug del tenant, o null si el formato no corresponde. */
export function slugDeComprobante(token: string): string | null {
  return /^([a-z0-9]+(?:-[a-z0-9]+)*)\.[A-Za-z0-9_-]{24}$/.exec(token)?.[1] ?? null;
}
