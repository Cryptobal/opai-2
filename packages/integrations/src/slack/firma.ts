import { createHmac, timingSafeEqual } from "node:crypto";

/** Tolerancia entre la marca de tiempo de Slack y la hora del servidor (anti-repetición, ADR-093 §10). */
export const TOLERANCIA_SLACK_S = 300;

export type CabecerasSlack = { timestamp: string | null; firma: string | null };

/**
 * Verifica la firma de una petición de Slack (Events API e interactividad): `v0=` + HMAC-SHA256 hex
 * de `v0:<timestamp>:<cuerpo crudo>` con el signing secret, comparada en tiempo constante. Rechaza
 * marcas de tiempo de más de 5 minutos. Falla cerrado ante cualquier duda (sin secreto, sin
 * cabeceras, formato raro).
 */
export function verificarFirmaSlack(
  signingSecret: string,
  cuerpo: string,
  h: CabecerasSlack,
  ahoraS = Math.floor(Date.now() / 1000),
): boolean {
  if (!signingSecret || !h.timestamp || !h.firma) return false;
  if (!/^\d{1,12}$/.test(h.timestamp)) return false;
  const ts = Number(h.timestamp);
  if (Math.abs(ahoraS - ts) > TOLERANCIA_SLACK_S) return false;
  if (!/^v0=[0-9a-f]{64}$/.test(h.firma)) return false;
  const esperada = createHmac("sha256", signingSecret)
    .update(`v0:${h.timestamp}:${cuerpo}`)
    .digest();
  const dada = Buffer.from(h.firma.slice(3), "hex");
  return dada.length === esperada.length && timingSafeEqual(dada, esperada);
}
