import { agregarAAuditoria } from "@opai/db";
import type { TenantTx } from "@opai/db";

import type { Contexto } from "../../types";

/** Deja constancia del hecho (renovado o propuesto) en la auditoría, en la misma transacción. */
export async function auditarCapturaPrevisional(
  ctx: Contexto,
  tx: TenantTx,
  hecho: { clave: string; accion: "renovado" | "propuesto"; dia: string },
): Promise<void> {
  await agregarAAuditoria(tx, ctx.tenantId, {
    actorTipo: "system",
    actorId: null,
    viaUserId: null,
    capability: "core.remuneraciones.captura_previsional",
    entityType: "valor_publicado",
    entityId: null,
    payload: { clave: hecho.clave, accion: hecho.accion, dia: hecho.dia },
  });
}
