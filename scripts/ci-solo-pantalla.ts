/**
 * Clasifica si un diff es «solo pantalla» (CAR-807): UI en apps/web, estilos/DS, novedades visuales
 * y specs e2e, sin tocar db, capabilities, auth, migraciones ni workflows de CI.
 */

export type EventoCi =
  | { tipo: "pull_request"; base: string; head: string }
  | { tipo: "merge_group"; base: string; head: string }
  | { tipo: "otro" };

const BLOQUEA = [
  /^packages\/db\//,
  /^packages\/capabilities\//,
  /^packages\/auth\//,
  /^modules\//,
  /^\.github\//,
  /\/prisma\//,
  /\/migrations\//,
  /^simplicidad-base\.json$/,
  /^pnpm-lock\.yaml$/,
];

/** Rutas de apps/web que requieren Neon, servidor o auth (no solo UI). */
const APPS_WEB_BLOQUEA = [
  /^apps\/web\/app\/api\//,
  /\/route\.ts$/,
  /^apps\/web\/middleware\.ts$/,
  /^apps\/web\/proxy\.ts$/,
  /^apps\/web\/lib\//,
  /^apps\/web\/next\.config\./,
  /^apps\/web\/package\.json$/,
  /^apps\/web\/tsconfig/,
  /^apps\/web\/.*\.env/,
  /\/_acciones\//,
  /acciones\.ts$/,
  /\/accion\.ts$/,
];

const PERMITIDO_OTROS = [
  /^packages\/ds\//,
  /^packages\/domain\/src\/novedades\/entradas\//,
];

function appsWebPermitido(ruta: string): boolean {
  if (!ruta.startsWith("apps/web/")) return false;
  if (APPS_WEB_BLOQUEA.some((re) => re.test(ruta))) return false;
  if (ruta.startsWith("apps/web/e2e/")) return true;
  if (ruta.startsWith("apps/web/public/")) return true;
  if (ruta.startsWith("apps/web/test/")) return true;
  if (ruta === "apps/web/playwright.config.ts") return true;
  if (ruta === "apps/web/presupuesto-js.json") return true;
  if (!ruta.startsWith("apps/web/app/")) return false;
  return /\.(tsx|css|scss|md)$/.test(ruta);
}

export function archivoSoloPantalla(ruta: string): boolean {
  if (BLOQUEA.some((re) => re.test(ruta))) return false;
  if (appsWebPermitido(ruta)) return true;
  return PERMITIDO_OTROS.some((re) => re.test(ruta));
}

export function diffSoloPantalla(archivos: string[]): boolean {
  if (archivos.length === 0) return false;
  return archivos.every(archivoSoloPantalla);
}

export function listarArchivosDiff(
  diff: (base: string, head: string) => string[],
  evento: EventoCi,
): string[] {
  if (evento.tipo === "otro") return [];
  return diff(evento.base, evento.head).filter(Boolean);
}

export function eventoDesdeGithub(payload: {
  eventName: string;
  pullRequest?: { base: { sha: string }; head: { sha: string } };
  mergeGroup?: { base_sha: string; head_sha: string };
}): EventoCi {
  if (payload.eventName === "pull_request" && payload.pullRequest) {
    return {
      tipo: "pull_request",
      base: payload.pullRequest.base.sha,
      head: payload.pullRequest.head.sha,
    };
  }
  if (payload.eventName === "merge_group" && payload.mergeGroup) {
    return {
      tipo: "merge_group",
      base: payload.mergeGroup.base_sha,
      head: payload.mergeGroup.head_sha,
    };
  }
  return { tipo: "otro" };
}