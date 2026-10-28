import type { TenantTx } from "@opai/db";

import type { Auditoria, Contexto, EventoAuditoria } from "./types";

/**
 * Contexto del handler que corre dentro de una transacción (escritura auditada, lectura auditada o
 * `enLectura`): los appends de auditoría (el de la capacidad, los de capacidades anidadas y las
 * revelaciones de montos sensibles a mitad del handler) se encolan y corren juntos justo antes del
 * COMMIT. Así el lock de auditoría del tenant (`core.auditoria_append`)
 * se toma al final y la transacción no pide nada al pool mientras lo tiene: una capacidad anidada
 * completa su idempotencia, su medición y sus avisos antes del lock (incidente del 28-oct-2026).
 * Si un append falla, la transacción entera hace ROLLBACK, como antes. Nadie usa `seq`/`hash` del
 * append encolado; se devuelven en cero.
 */
export function conAuditoriaAlFinal(ctx: Contexto, tx: TenantTx) {
  const cola: EventoAuditoria[] = [];
  const auditoria: Auditoria = {
    ...ctx.auditoria,
    // Solo se encola lo de esta transacción; una `transaccionIndependiente` (diagnóstico durable
    // que debe sobrevivir al ROLLBACK) audita en la suya, de inmediato.
    registrar: async (otra, evento) => {
      if (otra !== tx) return ctx.auditoria.registrar(otra, evento);
      cola.push(evento);
      return { seq: 0, hash: "" };
    },
  };
  const ctxHandler: Contexto = { ...ctx, db: tx, transaccion: (fn) => fn(tx), auditoria };
  return {
    ctx: ctxHandler,
    /** Agrega el evento propio (si hay) al final y vuelca todo con el `registrar` real, en orden. */
    async volcar(propio?: EventoAuditoria) {
      for (const evento of propio ? [...cola, propio] : cola)
        await ctx.auditoria.registrar(tx, evento);
    },
  };
}
