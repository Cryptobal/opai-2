import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Estado de la transacción en curso (`enTransaccion`). Si la transacción ya tomó el lock de
 * auditoría del tenant (`core.auditoria_append`), no puede esperar otra conexión del pool: si el
 * pool está agotado por requests que esperan ese mismo lock, la transacción queda «idle in
 * transaction» con el lock y nadie avanza (incidente del 28-oct-2026 a las 15:53).
 */
type EstadoTransaccion = { conLockAuditoria: boolean; terminada: boolean };

const estado = new AsyncLocalStorage<EstadoTransaccion>();

/**
 * Corre `fn` como cuerpo de una transacción (anidar abre un estado propio). Al terminar `fn` el
 * estado se cierra: el trabajo diferido que lo heredó (por ejemplo `after()`, que copia el contexto
 * asíncrono) corre después del COMMIT y ya no está dentro de la transacción.
 */
export function comoTransaccion<T>(fn: () => Promise<T>): Promise<T> {
  const actual: EstadoTransaccion = { conLockAuditoria: false, terminada: false };
  return estado.run(actual, async () => {
    try {
      return await fn();
    } finally {
      actual.terminada = true;
    }
  });
}

/** El append de auditoría tomó el lock del tenant: desde aquí la transacción no pide al pool. */
export function marcarLockAuditoria(): void {
  const actual = estado.getStore();
  if (actual) actual.conLockAuditoria = true;
}

/** Lanza si se pide otra conexión del pool mientras la transacción tiene el lock de auditoría. */
export function exigirSinLockAuditoria(operacion: string): void {
  const actual = estado.getStore();
  if (!actual?.conLockAuditoria || actual.terminada) return;
  throw new Error(
    `${operacion} pediría otra conexión del pool mientras la transacción tiene el lock de ` +
      "auditoría: usa `tx` o hazlo después del commit.",
  );
}
