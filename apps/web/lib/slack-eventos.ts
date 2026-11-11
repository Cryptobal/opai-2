import { z } from "zod";

/** Cuerpo máximo aceptado de Slack (los eventos reales pesan pocos KB). */
export const MAX_CUERPO_SLACK = 256 * 1024;

const verificacion = z.object({
  type: z.literal("url_verification"),
  challenge: z.string().max(200),
});
const eventoCallback = z.object({
  type: z.literal("event_callback"),
  team_id: z.string().regex(/^T[A-Z0-9]{4,}$/),
  event: z.object({
    type: z.string().max(64),
    /** tokens_revoked: qué tokens se revocaron. Solo nos importan los del bot. */
    tokens: z.object({ bot: z.array(z.string()).optional() }).optional(),
  }),
});

export type EventoSlack =
  | { tipo: "verificacion"; challenge: string }
  | { tipo: "desinstalada"; teamId: string }
  | { tipo: "ignorado" };

/**
 * Interpreta un cuerpo de Slack ya firmado (CAR-291). Solo reconoce la verificación de la URL, la
 * desinstalación de la app y la revocación del token del bot; todo lo demás (incluidos los mensajes,
 * que llegan desde F5a) se ignora sin guardar nada.
 */
export function leerEventoSlack(cuerpo: string): EventoSlack {
  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    return { tipo: "ignorado" };
  }
  const v = verificacion.safeParse(json);
  if (v.success) return { tipo: "verificacion", challenge: v.data.challenge };
  const e = eventoCallback.safeParse(json);
  if (!e.success) return { tipo: "ignorado" };
  const { type, tokens } = e.data.event;
  if (type === "app_uninstalled") return { tipo: "desinstalada", teamId: e.data.team_id };
  if (type === "tokens_revoked" && (tokens?.bot?.length ?? 0) > 0) {
    return { tipo: "desinstalada", teamId: e.data.team_id };
  }
  return { tipo: "ignorado" };
}

/** Motivos que la pantalla de Slack sabe explicar; cualquier otro se muestra como genérico. */
export function motivoDeError(error: { code: string; detalles?: unknown }): string {
  const m = (error.detalles as { motivo?: unknown } | undefined)?.motivo;
  if (typeof m === "string" && /^[a-z_]{1,40}$/.test(m)) return m;
  return error.code === "FORBIDDEN" ? "enlace" : "slack";
}
