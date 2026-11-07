import type { TenantTx } from "./transaccion";

// Prueba gratis por empresa (CAR-222): operaciones con nombre de Plataforma sobre las pruebas de UNA
// empresa. `db` es `forTenant(tenantId)` (la RLS aplica) y cada consulta filtra además por `tenantId`.

const pruebaGratis = {
  moduloId: true,
  inicio: true,
  hasta: true,
  extensiones: true,
  cerradaEn: true,
  createdAt: true,
} as const;

export function operacionesPruebasGratis(db: TenantTx, tenantId: string) {
  return {
    /** Prueba gratis de un módulo o parte de la empresa (CAR-222): null si nunca la activó. */
    pruebaGratis: (moduloId: string) =>
      db.pruebaGratis.findFirst({ where: { tenantId, moduloId }, select: pruebaGratis }),
    pruebasGratis: () =>
      db.pruebaGratis.findMany({
        where: { tenantId },
        orderBy: { moduloId: "asc" },
        select: pruebaGratis,
      }),
    /** Extiende o reactiva: nuevo último día y vuelve a quedar vigente. 0 si la fila ya no existe. */
    actualizarPruebaGratis: async (moduloId: string, hasta: Date, extensiones: number) =>
      (
        await db.pruebaGratis.updateMany({
          where: { tenantId, moduloId },
          data: { hasta, extensiones, cerradaEn: null },
        })
      ).count,
  };
}
