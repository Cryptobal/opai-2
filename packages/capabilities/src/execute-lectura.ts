import { conAuditoriaAlFinal } from "./execute-auditoria-final";
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
    // Los appends del handler y el de la lectura van juntos al final (lock de auditoría corto).
    const alFinal = conAuditoriaAlFinal(ctx, tx);
    const crudo = await c.handler(alFinal.ctx, entrada, modo);
    const validada = c.output.safeParse(crudo);
    await alFinal.volcar(
      validada.success
        ? {
            tenantId: ctx.tenantId,
            capability: c.id,
            actor: ctx.actor,
            payload: { ids: [...new Set(proyectar(validada.data, entrada))] },
          }
        : undefined,
    );
    return validada;
  });
}
