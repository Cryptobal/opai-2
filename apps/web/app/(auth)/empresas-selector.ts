import type { MembresiaConTenant } from "@/lib/fuentes";

/** Datos de empresa para el selector tras login u OAuth (CAR-247, CAR-746). */
export function empresasParaSelector(
  usables: MembresiaConTenant[],
  accesos: Map<string, Date | null>,
) {
  return usables.map((m) => ({
    tenantId: m.tenantId,
    nombre: m.tenant.nombre,
    rol: m.rol,
    ultimoAcceso: accesos.get(m.tenantId)?.toISOString() ?? null,
  }));
}