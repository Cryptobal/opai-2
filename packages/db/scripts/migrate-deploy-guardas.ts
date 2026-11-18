// Reglas puras para `migrate-deploy-ci.ts` (sin tocar Prisma ni red).
import { RAMA_PREVIEW } from "@opai/domain";

const LOCAL = new Set(["localhost", "127.0.0.1"]);
const RAMAS_NEON_PROTEGIDAS = new Set(["main", "dev", "production"]);

export function hostDeUrl(url: string): string {
  return new URL(url).hostname.replace("-pooler", "");
}

export function esBaseLocal(url: string): boolean {
  return LOCAL.has(new URL(url).hostname);
}

/** Añade `lock_timeout=5s` de sesión a la URL de Postgres para `migrate deploy`. */
export function urlConLockTimeoutSesion(url: string): string {
  const u = new URL(url);
  const actual = u.searchParams.get("options") ?? "";
  if (/lock_timeout/i.test(actual)) return url;
  const extra = "-c lock_timeout=5s";
  u.searchParams.set("options", actual ? `${actual} ${extra}` : extra);
  return u.toString();
}

export type RamaNeon = { name: string; created_at: string; default?: boolean };

export function ramaNeonProtegida(nombre: string): boolean {
  return RAMAS_NEON_PROTEGIDAS.has(nombre);
}

export function exigirPreviewCoherente(ramaPreview: string, ramaNeon: string | null): void {
  if (!RAMA_PREVIEW.test(ramaPreview)) {
    throw new Error(`PREVIEW_RAMA debe ser preview/pr-N; recibió «${ramaPreview}».`);
  }
  if (ramaNeon && ramaNeon !== ramaPreview) {
    throw new Error(
      `DATABASE_URL_MIGRATE apunta a la rama Neon «${ramaNeon}», no a «${ramaPreview}».`,
    );
  }
}

/** Resuelve la rama Neon por el host del endpoint (compara connection-string de cada rama). */
export function resolverRamaNeonPorHost(
  hostObjetivo: string,
  ramas: readonly { name: string; host: string }[],
): string | null {
  const h = hostObjetivo.replace("-pooler", "");
  const hit = ramas.find((r) => r.host.replace("-pooler", "") === h);
  return hit?.name ?? null;
}

export function hayRespaldoReciente(ramas: readonly RamaNeon[], haceMs: number): boolean {
  const desde = Date.now() - haceMs;
  return ramas.some((r) => {
    if (!/^respaldo-/i.test(r.name)) return false;
    return new Date(r.created_at).getTime() >= desde;
  });
}

export function exigirRespaldoAntesDeProtegida(ramas: readonly RamaNeon[], ramaNeon: string): void {
  if (!ramaNeonProtegida(ramaNeon)) return;
  if (!hayRespaldoReciente(ramas, 48 * 60 * 60 * 1000)) {
    throw new Error(
      `Migración en rama Neon «${ramaNeon}»: no hay respaldo-* creado en las últimas 48 h.`,
    );
  }
}