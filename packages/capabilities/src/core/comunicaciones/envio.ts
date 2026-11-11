import { renderizarCorreo } from "@opai/domain";
import type { TenantTx } from "@opai/db";
import type { AdjuntoCorreo, Mailer } from "@opai/integrations";

import { asegurarBuzon, direccionDelBuzon } from "../correos/comun";
import { type Saliente, registrarSaliente } from "../correos/registrar";
import { comunicableDe, marcaDe, plantillaVigente } from "./resolver";

/**
 * Registro del envío en el historial del cliente (CAR-233): origen y fichas que toca. Con esto el correo
 * lleva como reply-to la dirección de registro de la empresa más la dirección que ya recibía las
 * respuestas (el remitente), para no dejar de recibirlas.
 */
export type HistorialEnvio = Pick<Saliente, "origen" | "cuentaId" | "contactoId" | "negocioId">;

/** Dirección desde la que sale el correo (el `from` del mailer), para conservarla como reply-to. */
export const remitenteDe = (correo: Mailer): string =>
  ("remitente" in correo && typeof correo.remitente === "string" && correo.remitente) ||
  process.env["EMAIL_FROM"] ||
  "OPAI <no-reply@opai.cl>";

/** Reply-to con la dirección de registro; si no se puede crear, el correo sale igual sin ella. */
async function responderAHistorial(d: DestinoCorreo): Promise<string[] | undefined> {
  try {
    return [direccionDelBuzon(await asegurarBuzon(d.db, d.tenantId)), remitenteDe(d.correo)];
  } catch {
    return undefined;
  }
}

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
  extra: {
    cc?: readonly string[];
    bcc?: readonly string[];
    adjuntos?: readonly AdjuntoCorreo[];
    historial?: HistorialEnvio;
  } = {},
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
    const responderA = extra.historial ? await responderAHistorial(d) : undefined;
    await d.correo.enviar({
      para,
      asunto: r.asunto,
      texto: r.texto,
      html: r.html,
      ...(extra.cc?.length ? { cc: extra.cc } : {}),
      ...(extra.bcc?.length ? { bcc: extra.bcc } : {}),
      ...(extra.adjuntos?.length ? { adjuntos: extra.adjuntos } : {}),
      ...(responderA ? { responderA } : {}),
    });
    await d.db.envio.create({ data: { ...base, estado: "enviado" } });
    if (extra.historial) {
      // El correo ya salió. La fila no tiene cómo violar una restricción (largos recortados, referencias
      // del mismo tenant que trae quien envía): el catch cubre fallas fuera de Postgres. Un error de la
      // base dentro de la transacción del envío la abortaría igual (pendiente: savepoint, ver ESTADO).
      await registrarSaliente(d.db, d.tenantId, {
        ...extra.historial, remitente: remitenteDe(d.correo), destinatarios: [para, ...(extra.cc ?? [])],
        asunto: r.asunto, texto: r.texto,
      }).catch(() => console.warn("[correos] no se registró el saliente en el historial"));
    }
    return true;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    await d.db.envio.create({ data: { ...base, estado: "fallido", error: mensaje.slice(0, 500) } });
    return false;
  }
}

/** Renderiza el correo de un evento con la plantilla vigente y la marca, sin enviarlo ni registrar nada. */
export async function previsualizarCorreo(
  d: Pick<DestinoCorreo, "db" | "tenantId" | "urlBase">,
  evento: string,
  datos: Record<string, unknown>,
) {
  const e = comunicableDe(evento);
  if (!e) throw new Error(`Evento no comunicable: ${evento}`);
  const plantilla = await plantillaVigente(d.db, e, "correo");
  if (!plantilla) return null;
  const r = renderizarCorreo(e, plantilla, datos, await marcaDe(d.db, d.tenantId, d.urlBase));
  return { asunto: r.asunto, texto: r.texto };
}
