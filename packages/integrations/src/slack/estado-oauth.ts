import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/** Vigencia del enlace «Conectar con Slack»: lo que dura el ida y vuelta del OAuth. */
export const VIGENCIA_ESTADO_OAUTH_S = 600;

const estadoSchema = z
  .object({
    /** Empresa que conecta. Al volver se exige que sea la empresa activa de la sesión. */
    t: z.uuid(),
    /** Usuario que inició la conexión. Al volver se exige que sea el mismo usuario con sesión. */
    u: z.uuid(),
    /** Vencimiento (segundos Unix). */
    e: z.number().int().positive(),
    /** Aleatorio: dos enlaces nunca son iguales. */
    n: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  })
  .strict();

export type EstadoOAuthSlack = z.infer<typeof estadoSchema>;

const b64 = (b: Buffer) => b.toString("base64url");
const mac = (clave: string, datos: string) =>
  createHmac("sha256", `opai:slack:oauth:${clave}`).update(datos).digest();

/**
 * `state` del OAuth de Slack: datos y HMAC-SHA256, ambos en base64url. Liga la vuelta a la empresa y
 * al usuario que la iniciaron (anti-CSRF) y vence en 10 minutos. La clave es un secreto del servidor
 * (BETTER_AUTH_SECRET); nunca va en el estado.
 */
export function firmarEstadoOAuth(
  clave: string,
  datos: { tenantId: string; userId: string },
  ahoraS = Math.floor(Date.now() / 1000),
): string {
  if (!clave) throw new Error("Falta la clave para firmar el estado del OAuth de Slack.");
  const carga: EstadoOAuthSlack = {
    t: datos.tenantId,
    u: datos.userId,
    e: ahoraS + VIGENCIA_ESTADO_OAUTH_S,
    n: b64(randomBytes(18)),
  };
  const cuerpo = b64(Buffer.from(JSON.stringify(carga)));
  return `${cuerpo}.${b64(mac(clave, cuerpo))}`;
}

/** Verifica firma y vigencia del `state`. null ante cualquier duda (falla cerrado). */
export function verificarEstadoOAuth(
  clave: string,
  estado: string | null | undefined,
  ahoraS = Math.floor(Date.now() / 1000),
): EstadoOAuthSlack | null {
  if (!clave || !estado || estado.length > 512) return null;
  const partes = estado.split(".");
  if (partes.length !== 2) return null;
  const [cuerpo, firma] = partes as [string, string];
  const esperada = mac(clave, cuerpo);
  const dada = Buffer.from(firma, "base64url");
  if (dada.length !== esperada.length || !timingSafeEqual(dada, esperada)) return null;
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const r = estadoSchema.safeParse(json);
  if (!r.success || r.data.e < ahoraS) return null;
  return r.data;
}
