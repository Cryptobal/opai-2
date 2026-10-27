import type { Capacidad, Contexto, ModoEjecucion } from "./types";

/** Valida una sola vez; no revela la salida hasta confirmar su auditoría en la misma transacción. */
export function ejecutarLecturaAuditada(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  modo: ModoEjecucion,
) {
  const proyectar = c.auditarLectura;
  if (!proyectar) throw new Error("La lectura no declara su proyección de auditoría.");
  return ctx.transaccion(async (tx) => {
    const crudo = await c.handler({ ...ctx, db: tx, transaccion: (fn) => fn(tx) }, entrada, modo);
    const validada = c.output.safeParse(crudo);
    if (validada.success)
      await ctx.auditoria.registrar(tx, {
        tenantId: ctx.tenantId,
        capability: c.id,
        actor: ctx.actor,
        payload: { ids: [...new Set(proyectar(validada.data, entrada))] },
      });
    return validada;
  });
}
