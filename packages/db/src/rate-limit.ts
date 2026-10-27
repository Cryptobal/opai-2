import { createHash } from "node:crypto";

import { clienteApp } from "./client";

/**
 * Rate limit centralizado (NÚCLEO-B). La cuenta vive en `core.rate_limit_ventanas` y se consume con la
 * función `SECURITY DEFINER` `core.rate_limit_consumir` (upsert atómico: cuenta y decide en una sola
 * operación, sin TOCTOU entre leer y escribir). `opai_app` no toca la tabla directo (REVOKE en la
 * migración); solo ejecuta las funciones. La clave se guarda hasheada (SHA-256 de
 * «ámbito:identificador»): la API key y la IP nunca quedan en claro ni en logs (Ley 21.719).
 */
export type ResultadoRateLimit = {
  permitido: boolean;
  restantes: number;
  /** Momento en que la ventana se reinicia (para calcular `Retry-After`). */
  reinicio: Date;
};

/** SHA-256 en hex de la clave en claro: es lo único que viaja a la base y se guarda como PK. */
function hashClave(clave: string): string {
  return createHash("sha256").update(clave).digest("hex");
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
