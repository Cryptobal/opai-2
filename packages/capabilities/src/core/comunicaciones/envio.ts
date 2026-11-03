import { renderizarCorreo } from "@opai/domain";
import type { TenantTx } from "@opai/db";
import type { AdjuntoCorreo, Mailer } from "@opai/integrations";

import { comunicableDe, marcaDe, plantillaVigente } from "./resolver";

export type DestinoCorreo = {
  db: TenantTx;
  tenantId: string;
  correo: Mailer;
  urlBase: string;
  eventoId?: string | null;
};

/**
 * Envía un correo de un evento comunicable con la plantilla vigente y la marca del tenant, y lo
 * registra en `core.envios` (enviado o fallido). Nunca lanza: la falla queda registrada.
 */
export async function enviarCorreo(
  d: DestinoCorreo,
  evento: string,
  para: string,
  datos: Record<string, unknown>,
  extra: { cc?: readonly string[]; adjuntos?: readonly AdjuntoCorreo[] } = {},
) {
  const e = comunicableDe(evento);
  if (!e) throw new Error(`Evento no comunicable: ${evento}`);
  const plantilla = await plantillaVigente(d.db, e, "correo");
  const base = {
    tenantId: d.tenantId,
    eventoId: d.eventoId ?? null,
    canal: "correo",
    destinatario: para,
    plantillaEvento: evento,
    plantillaVersion: plantilla?.version ?? null,
  };
  if (!plantilla) {
    await d.db.envio.create({
      data: { ...base, estado: "omitido", error: "Sin plantilla de correo." },
    });
    return false;
  }
  try {
    const r = renderizarCorreo(e, plantilla, datos, await marcaDe(d.db, d.tenantId, d.urlBase));
    await d.correo.enviar({
      para,
      asunto: r.asunto,
      texto: r.texto,
      html: r.html,
      ...(extra.cc?.length ? { cc: extra.cc } : {}),
      ...(extra.adjuntos?.length ? { adjuntos: extra.adjuntos } : {}),
    });
    await d.db.envio.create({ data: { ...base, estado: "enviado" } });
    return true;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    await d.db.envio.create({ data: { ...base, estado: "fallido", error: mensaje.slice(0, 500) } });
    return false;
  }
}
