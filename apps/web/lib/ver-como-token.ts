import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { PORTALES_VER_COMO } from "@opai/domain";

/** Cookie `httpOnly` de «ver como» (CAR-528): solo la escribe y la lee el servidor. */
export const COOKIE_VER_COMO = "opai_ver_como";

const vistaSchema = z.object({
  tenantId: z.string(),
  porUserId: z.string(),
  sesionId: z.string(),
  portal: z.enum(PORTALES_VER_COMO),
  objetivoId: z.string(),
  nombre: z.string(),
  userId: z.string().nullable(),
  personaId: z.string().nullable().optional(),
  dispositivoId: z.string().nullable(),
  expira: z.number(),
});

/** Quién mira (con qué sesión y en qué empresa), a quién y hasta cuándo (epoch ms). */
export type VerComo = z.infer<typeof vistaSchema>;

let claveCache: Buffer | null = null;

/** HMAC derivado (HKDF-SHA256) del secreto de auth, distinto del de la IP y del bloqueo. */
function clave(): Buffer {
  if (claveCache) return claveCache;
  const secreto = process.env["BETTER_AUTH_SECRET"];
  if (!secreto) throw new Error("Falta BETTER_AUTH_SECRET para firmar «ver como».");
  claveCache = Buffer.from(hkdfSync("sha256", secreto, "", "opai:ver-como", 32));
  return claveCache;
}

const firma = (cuerpo: string) => createHmac("sha256", clave()).update(cuerpo).digest();

export function firmarVerComo(v: VerComo): string {
  const cuerpo = Buffer.from(JSON.stringify(vistaSchema.parse(v))).toString("base64url");
  return `${cuerpo}.${firma(cuerpo).toString("base64url")}`;
}

/** La vista firmada y no vencida, o null (firma inválida, alterada, mal formada o vencida). */
export function leerVerComo(token: string | undefined, ahora = Date.now()): VerComo | null {
  const [cuerpo, sello, ...resto] = (token ?? "").split(".");
  if (!cuerpo || !sello || resto.length) return null;
  const esperado = firma(cuerpo);
  const recibido = Buffer.from(sello, "base64url");
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) return null;
  try {
    const v = vistaSchema.safeParse(JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")));
    return v.success && v.data.expira > ahora ? v.data : null;
  } catch {
    return null;
  }
}
