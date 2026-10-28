import { jsonCanonico } from "@opai/domain";

import { falla } from "../autorizacion";
import { sinSensibles } from "../execute-util";
import type { Capacidad, Contexto, OpcionesEjecucion, Resultado } from "../types";
import { auditarEnPlataforma, hechoPlataforma } from "./plataforma";

/**
 * Pedido de aprobación de una acción `platform.*` (CAR-36): va a la cola de plataforma, con su
 * auditoría de plataforma en la misma transacción (ADR-052). Nada queda en la empresa de la key:
 * ni la fila, ni la auditoría, ni el evento `core.aprobacion.pendiente` (que avisaría a sus admins).
 */
export async function aprobacionDePlataforma(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  opciones: OpcionesEjecucion,
  agente: { apiKeyId: string | null; nombre: string },
  pedido: { resumen: string; venceEn: Date },
  requerida: (id: string) => Resultado,
): Promise<Resultado> {
  const p = ctx.plataforma;
  if (!p || ctx.actor.tipo !== "agent") return falla("FORBIDDEN", "Solo usuarios de plataforma.");
  const input = JSON.parse(JSON.stringify(entrada ?? {}));
  const repetida = opciones.idempotencyKey
    ? await p.globales.aprobacionPlataformaRepetida({
        apiKeyId: agente.apiKeyId,
        capability: c.id,
        idempotencyKey: opciones.idempotencyKey,
      })
    : null;
  if (repetida) {
    if (jsonCanonico(repetida.input) !== jsonCanonico(input)) {
      return falla("CONFLICT", "La clave de idempotencia ya se usó con otro input.");
    }
    // Si la anterior venció (aunque nadie la haya marcado todavía), se pide de nuevo.
    const vencida =
      repetida.estado === "vencida" ||
      (repetida.estado === "pendiente" && repetida.venceEn.getTime() <= Date.now());
    if (!vencida) return requerida(repetida.id);
  }
  const viaUserId = ctx.actor.viaUserId;
  const interno = ctx.actor.interno ? ctx.actor.id : null;
  const id = await ctx.transaccion(async (tx) => {
    const fila = await p.globales.crearAprobacionPlataforma(
      {
        origenTenantId: ctx.conTenant ? ctx.tenantId : null,
        apiKeyId: agente.apiKeyId,
        agente: agente.nombre,
        agenteInternoId: interno,
        viaUserId,
        capability: c.id,
        input,
        idempotencyKey: opciones.idempotencyKey ?? null,
        resumen: pedido.resumen,
        venceEn: pedido.venceEn,
      },
      tx,
    );
    const payload = {
      intento: "APPROVAL_REQUIRED",
      aprobacionId: fila.id,
      input: sinSensibles(entrada, c.sensibles),
    };
    await auditarEnPlataforma(
      ctx,
      hechoPlataforma(ctx, {
        capability: c.id,
        tenantObjetivoId: c.tenantObjetivo?.(entrada, undefined) ?? null,
        entityType: "aprobacion",
        entityId: fila.id,
        payload,
      }),
      tx,
    );
    return fila.id;
  });
  return requerida(id);
}
