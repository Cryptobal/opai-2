import type { TenantTx } from "@opai/db";

import type { Contexto } from "../types";
import type { Operacion } from "./ajustar-ops";

/**
 * Renombrar (R67): deja el antes/después en `core.audit_events` y emite `cpq.cotizacion.renombrada`
 * por outbox, ambos en la transacción de la escritura (ADR-052). El código CPQ-AAAA-NNN no cambia.
 * La auditoría propia de la capacidad guarda solo el input (el título nuevo); este registro aporta el
 * anterior, como `core.estructuras.read_sensible` para las lecturas de sueldo.
 */
export async function renombrada(
  ctx: Contexto,
  tx: TenantTx,
  c: { id: string; codigo: string; titulo: string },
  operaciones: readonly Operacion[],
): Promise<void> {
  const ultima = operaciones.filter((o) => o.op === "renombrar").at(-1);
  if (!ultima || ultima.titulo === c.titulo) return;
  const payload = { codigo: c.codigo, antes: c.titulo, despues: ultima.titulo };
  await ctx.auditoria.registrar(tx, {
    tenantId: ctx.tenantId,
    // Pseudo-capacidad que marca el renombre con su antes/después (no es un ejecutor del registro).
    capability: "cpq.cotizaciones.renombrada",
    actor: ctx.actor,
    entityType: "cotizacion",
    entityId: c.id,
    payload,
  });
  await ctx.eventos.emitir(tx, {
    tipo: "cpq.cotizacion.renombrada",
    entidadTipo: "cotizacion",
    entidadId: c.id,
    payload,
  });
}
