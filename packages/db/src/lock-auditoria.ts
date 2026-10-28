import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Estado de la transacción en curso (`enTransaccion`). Si la transacción ya tomó el lock de
 * auditoría del tenant (`core.auditoria_append`), no puede esperar otra conexión del pool: si el
 * pool está agotado por requests que esperan ese mismo lock, la transacción queda «idle in
 * transaction» con el lock y nadie avanza (incidente del 28-oct-2026 a las 15:53).
 */
type EstadoTransaccion = { conLockAuditoria: boolean };

const estado = new AsyncLocalStorage<EstadoTransaccion>();

/** Corre `fn` como cuerpo de una transacción (anidar abre un estado propio). */
export function comoTransaccion<T>(fn: () => Promise<T>): Promise<T> {
  return estado.run({ conLockAuditoria: false }, fn);
}

/** El append de auditoría tomó el lock del tenant: desde aquí la transacción no pide al pool. */
export function marcarLockAuditoria(): void {
  const actual = estado.getStore();
  if (actual) actual.conLockAuditoria = true;
}

/** Lanza si se pide otra conexión del pool mientras la transacción tiene el lock de auditoría. */
export function exigirSinLockAuditoria(operacion: string): void {
  if (!estado.getStore()?.conLockAuditoria) return;
  throw new Error(
    `${operacion} pediría otra conexión del pool mientras la transacción tiene el lock de ` +
      "auditoría: usa `tx` o hazlo después del commit.",
  );
}
