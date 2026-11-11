import { createHash, timingSafeEqual } from "node:crypto";

import type { Contexto } from "@opai/capabilities";
import { tenantsOperables } from "@opai/db";

/**
 * Autoriza una ruta de cron con `Authorization: Bearer ${CRON_SECRET}` (Vercel lo envía). Sin el
 * secreto configurado, la ruta no opera (503) para que nadie dispare trabajo sin control.
 */
export function autorizarCron(req: Request): Response | null {
  const secreto = process.env["CRON_SECRET"];
  if (!secreto)
    return Response.json({ ok: false, error: "CRON_SECRET no configurado." }, { status: 503 });
  if (!igualSeguro(req.headers.get("authorization") ?? "", `Bearer ${secreto}`)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return null;
}

/** Comparación en tiempo constante (sobre hashes, así el largo no filtra información). */
function igualSeguro(a: string, b: string): boolean {
  const h = (x: string) => createHash("sha256").update(x).digest();
  return timingSafeEqual(h(a), h(b));
}

/** "aaaa-mm-dd" de hoy en la zona del tenant. */
export function hoyEn(zona: string, ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, dateStyle: "short" }).format(ahora);
}

/** «aaaa-mm-ddTHH» (hora calendario del tenant, UTC+0 etiqueta) para trabajos horarios. */
export function horaEn(zona: string, ahora = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(ahora);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}`;
}

/** Ejecuta `fn` por cada tenant operable; un tenant que falla no detiene a los demás. */
export async function porTenant<T>(
  fn: (t: { id: string; slug: string; timezone: string }) => Promise<T>,
) {
  const tenants = await tenantsOperables();
  const resultados: Record<string, T | { error: string }> = {};
  for (const t of tenants) {
    try {
      resultados[t.slug] = await fn(t);
    } catch (e) {
      resultados[t.slug] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  return resultados;
}

/** Encola la captura diaria UF/UTM del SII (una corrida global; ancla timezone en el primer tenant operable). */
export async function encolarCapturaSiiDesdeCron(
  programarCapturaSii: (ctx: Contexto, hoy: string) => Promise<boolean>,
  contextoSistema: (tenantId: string) => Contexto,
): Promise<boolean | null> {
  const operables = await tenantsOperables();
  const ancla = operables[0];
  if (!ancla) return null;
  const hoy = hoyEn(ancla.timezone);
  return programarCapturaSii(contextoSistema(ancla.id), hoy);
}

/**
 * Hora UTC desde la que se encolan los trabajos diarios (06:00 de Chile): la misma a la que corría el programador
 * cuando era un cron diario. Las horas siguientes repiten el intento por si esa vuelta falló; la clave única por día
 * de cada trabajo evita duplicarlo.
 */
const HORA_DIARIOS_UTC = 9;

export function tocaTrabajosDiarios(ahora = new Date()): boolean {
  return ahora.getUTCHours() >= HORA_DIARIOS_UTC;
}
