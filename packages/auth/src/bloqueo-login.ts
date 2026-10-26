import { createHmac, hkdfSync } from "node:crypto";

import { clienteAuth } from "@opai/db";
import { type ConteosLogin, LOGIN_VENTANA_MS, superaLimiteLogin } from "@opai/domain";

/**
 * Bloqueo de login persistido (B1, Brief 07c). Decide la pausa por fuerza bruta **contando los
 * intentos de contraseña fallidos** que viven en `core.login_intentos` (append-only, sin RLS como
 * `users`): por correo+IP, por correo (global) y por IP. Contar en vez de mutar un contador evita la
 * carrera de lectura-escritura (cada fallo es un `INSERT`) y cubre los correos que no existen sin
 * revelar si existen: se cuenta por el hash del correo, no por el usuario. Se engancha en Better Auth
 * (ver `auth.ts`), así cubre la Server Action y el POST directo a `/api/auth/.../sign-in/email`.
 * Sin datos personales en claro: el correo se guarda como HMAC con clave derivada del secreto de auth.
 */
export const MENSAJE_PAUSA = "Hubo demasiados intentos. Vuelve a intentarlo en unos minutos.";

/** Retención de los intentos (días). Los purga el cron; acota el crecimiento y minimiza datos. */
export const LOGIN_RETENCION_DIAS = 30;

let claveHashCache: Buffer | null = null;

/** Clave del HMAC derivada (HKDF-SHA256) del secreto de auth ya presente en el entorno. */
function claveHash(): Buffer {
  if (claveHashCache) return claveHashCache;
  const secreto = process.env["BETTER_AUTH_SECRET"];
  if (!secreto) throw new Error("Falta BETTER_AUTH_SECRET para el hash del correo del bloqueo.");
  claveHashCache = Buffer.from(hkdfSync("sha256", secreto, "", "opai:bloqueo-login:correo", 32));
  return claveHashCache;
}

/** Correo normalizado a HMAC-SHA256 con clave derivada (nunca en claro ni en logs, Ley 21.719). */
export function hashCorreo(correo: string): string {
  return createHmac("sha256", claveHash()).update(correo.trim().toLowerCase()).digest("hex");
}

export type DatosIntento = { correo: string; ip: string | null; userAgent: string | null };

/** Datos del intento a partir del contexto del hook de Better Auth (correo del body, IP y agente). */
export function datosDeContexto(ctx: {
  body?: { email?: unknown } | null | undefined;
  headers?: Headers | null | undefined;
}): DatosIntento | null {
  const correo = typeof ctx.body?.email === "string" ? ctx.body.email : "";
  if (!correo) return null;
  const h = ctx.headers ?? null;
  // Vercel pone el IP real del cliente como primer valor de `x-forwarded-for`; es el que confiamos.
  const reenviada = h?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    correo,
    ip: reenviada || h?.get("x-real-ip") || null,
    userAgent: h?.get("user-agent") || null,
  };
}

/**
 * Conteos de fallos de contraseña en la ventana, por dimensión. Nunca busca al usuario: cuenta por
 * `correoHash`, así hace exactamente las mismas lecturas exista o no el correo (ni siquiera por
 * tiempo revela si existe). Un ingreso correcto del correo reinicia su contador: solo se cuentan los
 * fallos posteriores al último éxito. Una IP ausente (`null`) no desactiva los límites: sus intentos
 * se agrupan por `ip IS NULL`. El contador por IP no se reinicia con el éxito de un correo (la IP es
 * compartida).
 */
async function conteosDe(correoHash: string, ip: string | null, ahora: Date): Promise<ConteosLogin> {
  const ventana = new Date(ahora.getTime() - LOGIN_VENTANA_MS);
  const db = clienteAuth();
  const ultimoExito = await db.loginIntento.findFirst({
    where: { correoHash, exito: true },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const desdeCorreo = ultimoExito && ultimoExito.createdAt > ventana ? ultimoExito.createdAt : ventana;
  const fallo = { motivo: "credenciales" } as const;
  const [correoIp, correo, ipc] = await Promise.all([
    db.loginIntento.count({ where: { ...fallo, correoHash, ip, createdAt: { gt: desdeCorreo } } }),
    db.loginIntento.count({ where: { ...fallo, correoHash, createdAt: { gt: desdeCorreo } } }),
    db.loginIntento.count({ where: { ...fallo, ip, createdAt: { gte: ventana } } }),
  ]);
  return { correoIp, correo, ip: ipc };
}

/**
 * Antes de validar la credencial: ¿el correo (o su IP) superó el límite de fallos en la ventana? Solo
 * lee; no escribe ni depende de que el usuario exista, para no revelar si el correo existe.
 */
export async function loginPausado(datos: DatosIntento): Promise<boolean> {
  return superaLimiteLogin(await conteosDe(hashCorreo(datos.correo), datos.ip, new Date()));
}

/**
 * Después del intento: registra el resultado como un hecho append-only. `codigo === null` es ingreso
 * correcto (reinicia el conteo del correo); `INVALID_EMAIL_OR_PASSWORD` cuenta como fallo de
 * contraseña (motivo `credenciales`, el único que suma al bloqueo); otros desenlaces solo se anotan.
 */
export async function registrarResultado(datos: DatosIntento, codigo: string | null): Promise<void> {
  const exito = codigo === null;
  const motivo = exito
    ? "ok"
    : codigo === "INVALID_EMAIL_OR_PASSWORD"
      ? "credenciales"
      : codigo === "ACCOUNT_SUSPENDED"
        ? "suspendida"
        : codigo === "ACCOUNT_LOCKED"
          ? "bloqueada"
          : codigo.toLowerCase();
  // No se resuelve el usuario aquí: buscarlo por correo (case-insensitive) en cada intento sería un
  // oráculo de enumeración por tiempo. El intento se indexa por `correoHash` (HMAC), que basta para
  // el bloqueo y para la auditoría de acceso (los intentos de un usuario conocido se hallan por hash).
  await clienteAuth().loginIntento.create({
    data: {
      correoHash: hashCorreo(datos.correo),
      exito,
      motivo,
      ip: datos.ip,
      userAgent: datos.userAgent,
    },
  });
}

/** Purga los intentos más viejos que la retención. La hace una función `SECURITY DEFINER` porque
 * `opai_app` solo puede anexar (REVOKE UPDATE/DELETE). La llama el cron diario. */
export async function purgarIntentosLogin(retencionDias = LOGIN_RETENCION_DIAS): Promise<number> {
  const filas = await clienteAuth().$queryRaw<{ purgados: number }[]>`
    SELECT "core"."purgar_login_intentos"(${retencionDias}::int) AS purgados`;
  return Number(filas[0]?.purgados ?? 0);
}
