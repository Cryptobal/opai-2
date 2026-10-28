import type { TenantTx } from "@opai/db";
import { esRol, portalesAdmitidos } from "@opai/domain";

import type { Miembro } from "./users-miembro";

/** Se llama tras actualizar la membresía, manteniendo su bloqueo de fila en la misma transacción. */
export async function limpiarPortalObsoleto(
  tx: TenantTx,
  tenantId: string,
  actual: Miembro,
  input: { rol?: string | undefined; portales?: string[] | undefined },
): Promise<void> {
  if (input.rol === undefined && input.portales === undefined) return;
  const rol = input.rol ?? actual.rol;
  const permitidos = (input.portales ?? actual.portales).filter((p) =>
    esRol(rol) ? portalesAdmitidos(rol).includes(p) : false,
  );
  // Evalúa la preferencia vigente en SQL: no pisa una elección concurrente que siga siendo válida.
  await tx.membership.updateMany({
    where: { id: actual.id, tenantId, portalInicio: { notIn: permitidos } },
    data: { portalInicio: null },
  });
}
