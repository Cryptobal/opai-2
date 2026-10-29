import { createHmac } from "node:crypto";

import { clienteApp } from "./client";

/**
 * Rate limit centralizado (NÚCLEO-B). La cuenta vive en `core.rate_limit_ventanas` y se consume con la
 * función `SECURITY DEFINER` `core.rate_limit_consumir` (upsert atómico: cuenta y decide en una sola
 * operación, sin TOCTOU entre leer y escribir). `opai_app` no toca la tabla directo (REVOKE en la
 * migración); solo ejecuta las funciones. La clave se guarda hasheada (HMAC-SHA256 de
 * «ámbito:identificador»): la API key y la IP nunca quedan en claro ni en logs (Ley 21.719).
 */
export type ResultadoRateLimit = {
  permitido: boolean;
  restantes: number;
  /** Momento en que la ventana se reinicia (para calcular `Retry-After`). */
  reinicio: Date;
};

/**
 * Sal del HMAC. Debe ser ESTABLE entre todas las instancias de Vercel (si no, cada instancia hashea
 * distinto y la cuenta deja de ser común). `RATE_LIMIT_SALT` si Carlos la fija; si no, reutiliza
 * `BETTER_AUTH_SECRET` (ya presente y estable). El valor por defecto solo sirve a dev/test.
 */
const SAL_RATE_LIMIT =
  process.env["RATE_LIMIT_SALT"] ?? process.env["BETTER_AUTH_SECRET"] ?? "opai::rate-limit::sal-dev";

/**
 * HMAC-SHA256 en hex de la clave en claro: es lo único que viaja a la base y se guarda como PK. Con sal
 * secreta, un volcado de la tabla no deja reconstruir por fuerza bruta la IP o la key (el espacio de las
 * IPv4 es pequeño, un SHA-256 pelado sería reversible; Ley 21.719).
 */
function hashClave(clave: string): string {
  return createHmac("sha256", SAL_RATE_LIMIT).update(clave).digest("hex");
}

/**
 * Consume una unidad de la ventana de `clave` (ámbito:identificador en claro; se hashea aquí). Lanza si
 * la base falla: el llamador decide el respaldo (fallo abierto con memoria en `apps/web/lib/rate-limit`).
 */
export async function consumirRateLimit(
  clave: string,
  maximo: number,
  ventanaS: number,
): Promise<ResultadoRateLimit> {
  const filas = await clienteApp().$queryRaw<
    { permitido: boolean; restantes: number; reinicio: Date }[]
  >`SELECT permitido, restantes, reinicio
      FROM "core"."rate_limit_consumir"(${hashClave(clave)}, ${maximo}::int, ${ventanaS}::int)`;
  const r = filas[0];
  if (!r) throw new Error("rate_limit_consumir no devolvió fila");
  return { permitido: r.permitido, restantes: Number(r.restantes), reinicio: r.reinicio };
}

/** Borra las ventanas sin actividad dentro de la retención. La llama el cron. Devuelve cuántas borró. */
export async function purgarVentanasRateLimit(retencionS = 86_400): Promise<number> {
  const filas = await clienteApp().$queryRaw<{ purgadas: number }[]>`
    SELECT "core"."rate_limit_purgar"(${retencionS}::int) AS purgadas`;
  return Number(filas[0]?.purgadas ?? 0);
}

/**
 * HMAC-SHA256 de una IP para el registro de seguridad (CAR-42): misma sal y mecanismo que el rate
 * limit, nunca la IP en claro ni reversible (Ley 21.719).
 */
export function hashIp(ip: string): string {
  return hashClave(`seguridad-ip:${ip}`);
}
