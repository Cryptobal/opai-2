import type { TenantTx } from "@opai/db";

/** Serializa crear/anular por tenant+capa+referencia, antes de comprobar vigencias. */
export async function bloquearCapa(tx: TenantTx, tenant: string, nivel: string, ref: string) {
  // La base en memoria no implementa SQL; la concurrencia se prueba contra Postgres real.
  if (typeof (tx as { $executeRaw?: unknown }).$executeRaw === "function") {
    const clave = `${tenant}:sueldo:${nivel}:${ref}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
  }
}
