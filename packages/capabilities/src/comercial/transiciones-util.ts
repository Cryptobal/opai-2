import type { TenantTx } from "@opai/db";

import type { Contexto } from "../types";
import { estadoDeTipo, segundosEntre } from "./dominio";

type NegocioFila = { id: string; etapaId: string; createdAt: Date };
type EtapaFila = { id: string; tipo: string };

/**
 * Aplica un cambio de etapa dentro de una transacción: registra el historial con los segundos en la
 * etapa anterior (R11), deriva el estado del tipo de la etapa (R8) y emite el evento de dominio.
 * `datos` permite fijar campos adicionales (ganado_en, perdido_en, motivo de pérdida, etc.).
 */
export async function aplicarEtapa(
  ctx: Contexto,
  tx: TenantTx,
  negocio: NegocioFila,
  destino: EtapaFila,
  opts: { evento: string; motivo?: string | null; datos?: Record<string, unknown> } = { evento: "comercial.negocio.etapa_cambiada" },
) {
  const ahora = new Date();
  const ultimo = await tx.historialEtapa.findFirst({
    where: { negocioId: negocio.id },
    orderBy: { cuando: "desc" },
  });
  const desde = ultimo?.cuando ?? negocio.createdAt;
  const r = await tx.negocio.update({
    where: { id: negocio.id },
    data: { etapaId: destino.id, estado: estadoDeTipo(destino.tipo), ...(opts.datos ?? {}) },
  });
  await tx.historialEtapa.create({
    data: {
      tenantId: ctx.tenantId,
      negocioId: negocio.id,
      deEtapaId: negocio.etapaId,
      aEtapaId: destino.id,
      actorTipo: ctx.actor.tipo,
      actorId: ctx.actor.id ?? null,
      motivo: opts.motivo ?? null,
      segundosEnAnterior: segundosEntre(desde, ahora),
    },
  });
  await ctx.eventos.emitir(tx, {
    tipo: opts.evento,
    entidadTipo: "negocio",
    entidadId: negocio.id,
    payload: { deEtapaId: negocio.etapaId, aEtapaId: destino.id, ...(opts.motivo ? { motivo: opts.motivo } : {}) },
  });
  return r;
}
