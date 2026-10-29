import { createHmac, hkdfSync } from "node:crypto";

import { clienteBloqueoLogin } from "@opai/db";
import { type ConteosLogin, LOGIN_VENTANA_MS, superaLimiteLogin } from "@opai/domain";

/**
 * Bloqueo de login persistido (B1, Brief 07c; política completa en BRIEF-07c §16.3 y §4.1, delegada
 * por Carlos en t365u y t366u). Decide la pausa por fuerza bruta **contando los intentos de
 * contraseña fallidos** que viven en `core.login_intentos` (append-only, sin RLS como `users`): por
 * correo+IP (5), por correo global (20) y por IP (30), en una ventana de 15 minutos. Contar en vez de
 * mutar un contador cubre los correos que no existen sin revelar si existen (se cuenta por el hash del
 * correo, no por el usuario) y permite medir varias dimensiones a la vez. Se engancha en Better Auth
 * (ver `auth.ts`), así cubre la Server Action y el POST directo a `/api/auth/.../sign-in/email`.
 *
 * Para cerrar la carrera (varios intentos simultáneos que contarían antes de que el fallo del otro se
 * grabe) el conteo y el alta van en UNA transacción bajo `pg_advisory_xact_lock` por correo: cada
 * intento serializado ve los provisionales de los anteriores. El intento se inserta provisional
 * (motivo `pendiente`, que cuenta como fallo) y el `after` lo resuelve a éxito o fallo con una función
 * `SECURITY DEFINER` (opai_app no actualiza ni borra: solo-anexar). Un ingreso correcto reinicia el
 * contador del correo y, como `exito=true` por esa IP, la exime del tope global; un restablecimiento
 * de contraseña exitoso también reinicia el contador. Sin datos personales en claro: el correo se
 * guarda como HMAC con clave derivada del secreto de auth.
 */
export const MENSAJE_PAUSA = "Hubo demasiados intentos. Vuelve a intentarlo en unos minutos.";

/**
 * Resultado de reservar un intento: `ok` trae el UUID del provisional (el `after` lo resuelve por ese
 * id); `pausa` es un tope superado; `ocupado` es que otro intento del mismo correo tiene el lock (se
 * responde 429 en vez de esperar). Para quien llama, `pausa` y `ocupado` se ven igual.
 */
export type ReservaIntento =
  { estado: "ok"; intentoId: string } | { estado: "pausa" } | { estado: "ocupado" };

/** Retención de los intentos (días). Los purga el cron; acota el crecimiento y minimiza datos. */
export const LOGIN_RETENCION_DIAS = 30;

/** Ventana de la exención del tope global: una IP que entró bien al correo dentro de la retención. */
const LOGIN_EXENCION_MS = LOGIN_RETENCION_DIAS * 24 * 60 * 60_000;

/** Motivo del intento provisional mientras se valida; cuenta como fallo hasta que el `after` lo resuelva. */
const MOTIVO_PENDIENTE = "pendiente";

/** Motivo de un ingreso correcto: el único éxito que exime del tope global (no `reset`, que no trae IP). */
const MOTIVO_INGRESO_OK = "ok";

/** Motivos que suman al bloqueo: el fallo de credenciales y el provisional aún sin resolver. */
const MOTIVOS_FALLO = [MOTIVO_PENDIENTE, "credenciales"];

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

/** Espera máxima del lock por correo (ms) antes de responder 429; la sección crítica dura milisegundos. */
export const LOCK_ESPERA_MS = 400;

/** ¿El error es el `lock_timeout` de Postgres (SQLSTATE 55P03), también envuelto por Prisma? */
function esTimeoutDeLock(e: unknown): boolean {
  return /55P03|lock timeout/i.test(
    e instanceof Error ? `${e.message} ${JSON.stringify(Reflect.get(e, "meta") ?? "")}` : "",
  );
}

/** Clave del contexto de Better Auth donde el `before` deja el UUID del provisional para el `after`. */
export const CLAVE_INTENTO = "opaiIntentoId";

/** UUID del provisional que el `before` dejó en el contexto de la petición, o `null` si no hay. */
export function intentoDeContexto(contexto: object): string | null {
  const id: unknown = Reflect.get(contexto, CLAVE_INTENTO);
  return typeof id === "string" && id ? id : null;
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
 * Antes de validar la credencial, en UNA transacción: toma el advisory lock por correo (serializa los
 * intentos del mismo correo), cuenta los fallos de la ventana por dimensión e inserta el intento
 * provisional. La espera del lock es acotada (`LOCK_ESPERA_MS`, `lock_timeout` local): la sección
 * crítica dura milisegundos, así que un intento legítimo (p. ej. la IP habitual con la contraseña
 * correcta) espera su turno aunque un tercero mande ráfagas al mismo correo; si el lock no se libera
 * dentro del presupuesto devuelve `ocupado` (el hook responde 429) y una ráfaga no acumula conexiones.
 * Devuelve `pausa` si ya superó el límite (sin insertar: la pausa no gasta un provisional) y, si no,
 * `ok` con el UUID del provisional para que el `after` lo resuelva por ese id.
 *
 * El conteo nunca busca al usuario: cuenta por `correoHash`, así hace las mismas lecturas exista o no
 * el correo (ni por tiempo revela si existe). Solo cuentan los fallos posteriores al último éxito del
 * correo (un ingreso correcto reinicia). El tope por IP no se reinicia con el éxito de un correo (la IP
 * es compartida). Una IP ausente (`null`) no desactiva los límites: se agrupa por `ip IS NULL`, tanto
 * para contar como para la exención. `exentaGlobal` = esa IP tiene un ingreso correcto (motivo `ok`,
 * no un `reset`) a este correo dentro de la retención, por lo que no le aplica el tope global (solo su
 * tope correo+IP).
 */
export async function reservarIntento(datos: DatosIntento): Promise<ReservaIntento> {
  const correoHash = hashCorreo(datos.correo);
  const ip = datos.ip;
  const ahora = new Date();
  const ventana = new Date(ahora.getTime() - LOGIN_VENTANA_MS);
  const exencion = new Date(ahora.getTime() - LOGIN_EXENCION_MS);
  const fallo = { motivo: { in: MOTIVOS_FALLO } };
  return clienteBloqueoLogin()
    .$transaction(async (tx): Promise<ReservaIntento> => {
      await tx.$executeRaw`SELECT set_config('lock_timeout', ${`${LOCK_ESPERA_MS}ms`}, true)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${correoHash}, 0))`;
      const ultimoExito = await tx.loginIntento.findFirst({
        where: { correoHash, exito: true },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const desde =
        ultimoExito && ultimoExito.createdAt > ventana ? ultimoExito.createdAt : ventana;
      const [correoIp, correo, ipc, exenta] = await Promise.all([
        tx.loginIntento.count({ where: { ...fallo, correoHash, ip, createdAt: { gt: desde } } }),
        tx.loginIntento.count({ where: { ...fallo, correoHash, createdAt: { gt: desde } } }),
        tx.loginIntento.count({ where: { ...fallo, ip, createdAt: { gte: ventana } } }),
        tx.loginIntento.findFirst({
          where: {
            correoHash,
            ip,
            exito: true,
            motivo: MOTIVO_INGRESO_OK,
            createdAt: { gt: exencion },
          },
          select: { id: true },
        }),
      ]);
      const conteos: ConteosLogin = { correoIp, correo, ip: ipc, exentaGlobal: exenta !== null };
      if (superaLimiteLogin(conteos)) return { estado: "pausa" };
      const { id } = await tx.loginIntento.create({
        data: {
          correoHash,
          exito: false,
          motivo: MOTIVO_PENDIENTE,
          ip,
          userAgent: datos.userAgent,
        },
        select: { id: true },
      });
      return { estado: "ok", intentoId: id };
    })
    .catch((e: unknown): ReservaIntento => {
      if (esTimeoutDeLock(e)) return { estado: "ocupado" };
      throw e;
    });
}

/**
 * Después del intento: resuelve el provisional a éxito o fallo. `codigo === null` es ingreso correcto
 * (motivo `ok`, `exito=true`: reinicia el conteo del correo y exime a la IP del tope global);
 * `INVALID_EMAIL_OR_PASSWORD` es fallo de contraseña (motivo `credenciales`, el único que suma al
 * bloqueo); otros desenlaces (p. ej. `ACCOUNT_SUSPENDED`, con contraseña correcta) solo se anotan y
 * dejan de contar. La marca va por `core.marcar_login_intento` (SECURITY DEFINER) porque opai_app no
 * actualiza; resuelve el provisional por el UUID que devolvió `reservarIntento` (no por correo e IP),
 * así el `after` marca exactamente el intento de su `before`. No se resuelve el usuario aquí (sería un oráculo por tiempo).
 */
export async function resolverIntento(intentoId: string, codigo: string | null): Promise<void> {
  const exito = codigo === null;
  const motivo = exito
    ? MOTIVO_INGRESO_OK
    : codigo === "INVALID_EMAIL_OR_PASSWORD"
      ? "credenciales"
      : codigo === "ACCOUNT_SUSPENDED"
        ? "suspendida"
        : codigo === "ACCOUNT_LOCKED"
          ? "bloqueada"
          : codigo.toLowerCase();
  await clienteBloqueoLogin().$queryRaw`
    SELECT "core"."marcar_login_intento"(${intentoId}::uuid, ${exito}::boolean, ${motivo}::text)`;
}

/**
 * Un restablecimiento de contraseña exitoso reinicia el contador del correo: se anota como un éxito
 * (sin IP ni contraseña) para que la ventana de conteo empiece de nuevo. Lo llama el `onPasswordReset`
 * de Better Auth, que ya validó el enlace; best-effort (ver `auth.ts`).
 */
export async function registrarRestablecimiento(correo: string): Promise<void> {
  await clienteBloqueoLogin().loginIntento.create({
    data: {
      correoHash: hashCorreo(correo),
      exito: true,
      motivo: "reset",
      ip: null,
      userAgent: null,
    },
  });
}

/** Purga los intentos más viejos que la retención. La hace una función `SECURITY DEFINER` porque
 * `opai_app` solo puede anexar (REVOKE UPDATE/DELETE). La llama el cron diario. */
export async function purgarIntentosLogin(retencionDias = LOGIN_RETENCION_DIAS): Promise<number> {
  const filas = await clienteBloqueoLogin().$queryRaw<{ purgados: number }[]>`
    SELECT "core"."purgar_login_intentos"(${retencionDias}::int) AS purgados`;
  return Number(filas[0]?.purgados ?? 0);
}
