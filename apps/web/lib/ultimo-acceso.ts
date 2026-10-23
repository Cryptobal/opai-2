import { forTenant } from "@opai/db";

/** Última actividad del usuario en cada tenant (medidor de consumos), una consulta por tenant. */
export async function ultimosAccesos(userId: string, tenantIds: readonly string[]) {
  const filas = await Promise.all(
    tenantIds.map(async (id) => {
      const e = await forTenant(id).consumo.findFirst({
        where: { recurso: "capacidad.ejecucion", actorTipo: "user", actorId: userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      return [id, e?.createdAt ?? null] as const;
    }),
  );
  return new Map(filas);
}
