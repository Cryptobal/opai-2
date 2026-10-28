import type { HechoPlataforma, TenantTx } from "@opai/db";

import type { Auditoria, Contexto, EventoAuditoria, Plataforma } from "./types";

/** El evento propio de la escritura: a la cadena de la empresa o a la global (CAR-36). */
export type EventoPropio = { empresa: EventoAuditoria } | { global: HechoPlataforma };

/**
 * Contexto del handler que corre dentro de una transacción (escritura auditada, lectura auditada o
 * `enLectura`): los appends de auditoría (el de la capacidad, los de capacidades anidadas y las
 * revelaciones de montos sensibles a mitad del handler) se encolan y corren juntos justo antes del
 * COMMIT. Así el lock de auditoría del tenant (`core.auditoria_append`)
 * se toma al final y la transacción no pide nada al pool mientras lo tiene: una capacidad anidada
 * completa su idempotencia, su medición y sus avisos antes del lock (incidente del 28-oct-2026).
 * Si un append falla, la transacción entera hace ROLLBACK, como antes. Nadie usa `seq`/`hash` del
 * append encolado; se devuelven en cero. Lo mismo para la auditoría global de plataforma (CAR-36):
 * se encola y se vuelca primero, antes que la de la empresa (un solo orden de locks: global, empresa).
 */
export function conAuditoriaAlFinal(ctx: Contexto, tx: TenantTx) {
  const cola: EventoAuditoria[] = [];
  const colaGlobal: HechoPlataforma[] = [];
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
  const p = ctx.plataforma;
  const plataforma: Plataforma | null = p && {
    ...p,
    globales: {
      ...p.globales,
      auditarPlataforma: async (hecho, otra) => {
        if (otra !== tx) return p.globales.auditarPlataforma(hecho, otra);
        colaGlobal.push(hecho);
        return { id: "", seq: 0, hash: "" };
      },
    },
  };
  const ctxHandler: Contexto = {
    ...ctx,
    db: tx,
    transaccion: (fn) => fn(tx),
    auditoria,
    plataforma,
  };
  return {
    ctx: ctxHandler,
    /** Encola el evento propio (si hay) al final y vuelca todo con los `registrar` reales, en orden. */
    async volcar(propio?: EventoPropio) {
      if (propio && "global" in propio) colaGlobal.push(propio.global);
      else if (propio) cola.push(propio.empresa);
      if (colaGlobal.length && !p) throw new Error("Auditoría global sin acceso de plataforma.");
      for (const hecho of colaGlobal) await p?.globales.auditarPlataforma(hecho, tx);
      for (const evento of cola) await ctx.auditoria.registrar(tx, evento);
    },
  };
}
