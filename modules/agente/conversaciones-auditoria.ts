import type { Contexto } from "@opai/capabilities";

type TenantTx = Contexto["db"];

/**
 * Deja en la auditoría de la empresa cuántas conversaciones del agente borró la retención. Lleva solo
 * el conteo, el corte y el origen: nunca títulos, mensajes ni IDs de conversaciones (Ley 21.719).
 * Corre en la misma transacción que el borrado, así que no hay borrado sin traza ni traza sin borrado.
 */
export async function auditarPurga(
  ctx: Contexto,
  tx: TenantTx,
  datos: { borradas: number; corte: Date; origen: "guardado" | "barrido" },
): Promise<void> {
  await ctx.auditoria.registrar(tx, {
    tenantId: ctx.tenantId,
    capability: "agente.conversaciones.vencidas",
    actor: ctx.actor,
    entityType: "agente_conversacion",
    payload: {
      borradas: datos.borradas,
      corte: datos.corte.toISOString(),
      origen: datos.origen,
    },
  });
}
