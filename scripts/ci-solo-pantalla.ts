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

/** Tests que vigilan fronteras de acceso (no solo UI). */
const APPS_WEB_TEST_ACCESO = [
  /^apps\/web\/test\/lint-acceso-db\.test\.ts$/,
  /^apps\/web\/test\/.*acceso.*\.test\.ts$/,
  /^apps\/web\/test\/permisos-/,
  /^apps\/web\/test\/seguridad-acceso\.test\.ts$/,
];

const PERMITIDO_OTROS = [
  /^packages\/ds\//,
  /^packages\/domain\/src\/novedades\/entradas\//,
];

const USE_SERVER = /['"]use server['"]/;

export function diffTieneUseServerAgregado(diff: string): boolean {
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    if (USE_SERVER.test(line)) return true;
  }
  return false;
}

function appsWebTestPermitido(ruta: string): boolean {
  if (!ruta.startsWith("apps/web/test/")) return false;
  if (APPS_WEB_TEST_ACCESO.some((re) => re.test(ruta))) return false;
  return true;
}

function appsWebPermitido(ruta: string): boolean {
  if (!ruta.startsWith("apps/web/")) return false;
  if (APPS_WEB_BLOQUEA.some((re) => re.test(ruta))) return false;
  if (ruta.startsWith("apps/web/e2e/")) return true;
  if (ruta.startsWith("apps/web/public/")) return true;
  if (appsWebTestPermitido(ruta)) return true;
  if (ruta === "apps/web/playwright.config.ts") return true;
  if (ruta === "apps/web/presupuesto-js.json") return true;
  if (!ruta.startsWith("apps/web/app/")) return false;
  return /\.(tsx|css|scss|md)$/.test(ruta);
}

export function archivoSoloPantalla(
  ruta: string,
  diffArchivo?: string,
): boolean {
  if (BLOQUEA.some((re) => re.test(ruta))) return false;
  if (!appsWebPermitido(ruta) && !PERMITIDO_OTROS.some((re) => re.test(ruta))) {
    return false;
  }
  if (
    ruta.endsWith(".tsx") &&
    diffArchivo &&
    diffTieneUseServerAgregado(diffArchivo)
  ) {
    return false;
  }
  return true;
}

export function diffSoloPantalla(
  archivos: string[],
  diffsPorArchivo?: Record<string, string>,
): boolean {
  if (archivos.length === 0) return false;
  return archivos.every((a) =>
    archivoSoloPantalla(a, diffsPorArchivo?.[a]),
  );
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