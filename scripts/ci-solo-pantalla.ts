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
  /^\.github\/workflows\//,
  /\/prisma\//,
  /\/migrations\//,
  /^simplicidad-base\.json$/,
  /^pnpm-lock\.yaml$/,
];

const PERMITIDO = [
  /^apps\/web\//,
  /^packages\/ds\//,
  /^packages\/domain\/src\/novedades\//,
];

export function archivoSoloPantalla(ruta: string): boolean {
  if (BLOQUEA.some((re) => re.test(ruta))) return false;
  return PERMITIDO.some((re) => re.test(ruta));
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