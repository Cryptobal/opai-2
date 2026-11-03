import { createHmac, timingSafeEqual } from "node:crypto";

/** Tolerancia entre la hora del mensaje y la del servidor (anti-replay), como pide Svix. */
export const TOLERANCIA_SVIX_S = 300;

export type CabecerasSvix = { id: string | null; timestamp: string | null; firma: string | null };

/**
 * Verifica la firma de un webhook de Svix/Resend: HMAC-SHA256 de `id.timestamp.cuerpo` con la clave
 * base64 del secreto (`whsec_…`), comparada en tiempo constante. Falla cerrado ante cualquier duda.
 */
export function verificarFirmaSvix(
  secreto: string,
  cuerpo: string,
  h: CabecerasSvix,
  ahoraS = Math.floor(Date.now() / 1000),
): boolean {
  if (!secreto || !h.id || !h.timestamp || !h.firma) return false;
  const ts = Number(h.timestamp);
  if (!Number.isInteger(ts) || Math.abs(ahoraS - ts) > TOLERANCIA_SVIX_S) return false;
  const clave = Buffer.from(secreto.startsWith("whsec_") ? secreto.slice(6) : secreto, "base64");
  if (!clave.length) return false;
  const esperada = createHmac("sha256", clave).update(`${h.id}.${h.timestamp}.${cuerpo}`).digest();
  return h.firma.split(" ").some((par) => {
    const [version, valor] = par.split(",");
    if (version !== "v1" || !valor) return false;
    const dada = Buffer.from(valor, "base64");
    return dada.length === esperada.length && timingSafeEqual(dada, esperada);
  });
}
