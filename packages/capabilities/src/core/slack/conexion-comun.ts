import { SLACK_RUTAS } from "@opai/integrations";

import type { Contexto } from "../../types";
import { PROVEEDOR_SLACK, SECRETO_TOKEN_SLACK, slack } from "./comun";

/** URL de vuelta del OAuth: debe ser igual a la del manifiesto del entorno (ADR-093 §10). */
export const urlVueltaSlack = (ctx: Contexto) =>
  `${ctx.servicios.urlBase.replace(/\/$/, "")}${SLACK_RUTAS.oauth}`;

/** Revoca un token sin propagar errores (instalación que no se pudo guardar o ya desconectada). */
export async function revocarSinFallar(token: string): Promise<boolean> {
  try {
    await slack().revocar(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Borra la conexión de la empresa: token cifrado, instalación y estado. La configuración (canales,
 * avisos) se conserva para que una reconexión la recupere. Una transacción, con evento por outbox.
 */
export async function borrarConexionSlack(ctx: Contexto, motivo: "desconectada" | "desinstalada") {
  await ctx.transaccion(async (tx) => {
    const fila = await tx.integracion.findUnique({
      where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: PROVEEDOR_SLACK } },
    });
    if (fila) {
      await tx.secreto.deleteMany({
        where: { tenantId: ctx.tenantId, integracionId: fila.id, nombre: SECRETO_TOKEN_SLACK },
      });
      await tx.integracion.update({
        where: { id: fila.id },
        data: { estado: "no_configurada", ultimoError: null },
      });
    }
    await tx.slackInstalacion.deleteMany({ where: { tenantId: ctx.tenantId } });
    await ctx.eventos.emitir(tx, {
      tipo: "core.integracion.actualizada",
      entidadTipo: "integracion",
      entidadId: PROVEEDOR_SLACK,
      payload: { proveedor: PROVEEDOR_SLACK, accion: motivo },
    });
  });
}
