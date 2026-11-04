import { enviarCorreo, type Contexto } from "@opai/capabilities";

import type { DestinatarioEnvio } from "../domain/documento/propuesta-tecnica";
import { datosCorreoCliente, EVENTO_CORREO_CLIENTE } from "./correo-cliente";

export async function enviarCorreosEnvioPropuesta(
  ctx: Contexto,
  destinatarios: readonly DestinatarioEnvio[],
  datos: Record<string, unknown>,
) {
  if (ctx.actor.tipo === "agent") return;
  for (const d of destinatarios) {
    try {
      await enviarCorreo(
        { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase },
        EVENTO_CORREO_CLIENTE,
        d.email,
        await datosCorreoCliente(ctx, datos),
      );
    } catch {
      /* best-effort */
    }
  }
}
