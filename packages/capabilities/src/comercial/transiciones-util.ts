import type { TenantTx } from "@opai/db";

import { conflicto } from "../errores";
import type { Contexto } from "../types";
import { estadoDeTipo, segundosEntre } from "./dominio";

type NegocioFila = { id: string; etapaId: string; estado: string; createdAt: Date };
type EtapaFila = { id: string; tipo: string };

/**
 * Aplica un cambio de etapa dentro de una transacción: registra el historial con los segundos en la
 * etapa anterior (R11), deriva el estado del tipo de la etapa (R8) y emite el evento de dominio.
 * `datos` permite fijar campos adicionales (ganado_en, perdido_en, motivo de pérdida, etc.).
 * El update se condiciona a la etapa y el estado leídos al validar: si otra transición (p. ej. un
 * `mover` contra un `ganar`) cambió el negocio entretanto, responde CONFLICT y no pisa el cierre.
 */
export async function aplicarEtapa(
  ctx: Contexto,
  tx: TenantTx,
  negocio: NegocioFila,
  destino: EtapaFila,
  opts: { evento: string; motivo?: string | null; datos?: Record<string, unknown> } = {
    evento: "comercial.negocio.etapa_cambiada",
  },
) {
  const ahora = new Date();
  const ultimo = await tx.historialEtapa.findFirst({
    where: { negocioId: negocio.id },
    orderBy: { cuando: "desc" },
  });
  const desde = ultimo?.cuando ?? negocio.createdAt;
  const { count } = await tx.negocio.updateMany({
    where: { id: negocio.id, etapaId: negocio.etapaId, estado: negocio.estado },
    data: { etapaId: destino.id, estado: estadoDeTipo(destino.tipo), ...(opts.datos ?? {}) },
  });
  if (count !== 1) throw conflicto("El negocio cambió mientras se procesaba; vuelve a intentarlo.");
  const r = await tx.negocio.findUnique({ where: { id: negocio.id } });
  if (!r) throw conflicto("El negocio cambió mientras se procesaba; vuelve a intentarlo.");
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
    payload: {
      deEtapaId: negocio.etapaId,
      aEtapaId: destino.id,
      ...(opts.motivo ? { motivo: opts.motivo } : {}),
    },
  });
  return r;
}
