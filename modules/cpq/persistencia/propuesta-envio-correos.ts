import { enviarCorreo, type Contexto } from "@opai/capabilities";

import type { DestinatarioEnvio } from "../domain/documento/propuesta-tecnica";

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
        "cpq.cotizacion.enviada",
        d.email,
        datos,
      );
    } catch {
      /* best-effort */
    }
  }
}
