import type { PrismaClient } from "../src/generated/prisma/client";

/** D10: solo marca el estado; conserva IDs, conceptos, ítems, fechas y motivo originales.
 * No convierte, no anula ni cambia ninguna capa activa. El predicado hace la operación
 * idempotente y segura con dos corridas concurrentes; updateMany es atómico.
 */
export async function archivarCargos(
  db: PrismaClient,
  { tenantId, dryRun }: { tenantId: string; dryRun: boolean },
) {
  const where = { tenantId, nivel: "cargo", estado: "vigente" };
  if (dryRun) return { candidatos: await db.estructuraSueldo.count({ where }), archivados: 0 };
  const r = await db.estructuraSueldo.updateMany({ where, data: { estado: "archivada" } });
  return { candidatos: r.count, archivados: r.count };
}
