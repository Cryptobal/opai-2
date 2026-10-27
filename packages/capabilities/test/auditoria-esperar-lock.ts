import { enTransaccion } from "@opai/db";

/** Barrera observable en PG: no basta con dormir y suponer que el append llegó al lock. */
export async function esperarLockAuditoria(tenantId: string, pid: number) {
  for (let intento = 0; intento < 100; intento++) {
    const [fila] = await enTransaccion(
      tenantId,
      (tx) => tx.$queryRaw<{ esperando: boolean }[]>`
      SELECT wait_event_type = 'Lock' AND wait_event = 'advisory' AS esperando
      FROM pg_stat_activity WHERE pid = ${pid}
    `,
    );
    if (fila?.esperando) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("El append concurrente no llegó al advisory lock del tenant.");
}
