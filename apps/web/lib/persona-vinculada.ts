import type { TenantTx } from "@opai/db";

/** Hay una persona del ERP vinculada a este usuario en el tenant (portal Trabajador, CAR-746). */
export async function personaVinculadaDe(
  db: TenantTx,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const p = await db.persona.findFirst({
    where: { tenantId, usuarioId: userId, archivadaEn: null, anonimizadaEn: null },
    select: { id: true },
  });
  return p !== null;
}