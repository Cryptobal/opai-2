import { createHash, timingSafeEqual } from "node:crypto";

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
