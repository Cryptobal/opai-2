// Reglas puras de `preview-huerfanas.ts` (sin base): qué rama se acepta y qué registros se destraban.

/** Solo ramas Neon efímeras de preview por PR. Nunca main, dev ni otra rama. */
export const RAMA_PREVIEW = /^preview\/pr-[0-9]+$/;

export type RegistroMigracion = {
  id: string;
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

/**
 * Registros fallidos (sin terminar ni revertidos) cuya migración ya no existe en el repo: típico de una
 * migración renombrada después de aplicarse en la rama de preview, que deja a Prisma en P3009. Una
 * migración fallida que SÍ está en el repo no se toca: ese fallo es real y el deploy debe mostrarlo.
 */
export function fallidasHuerfanas(
  registros: readonly RegistroMigracion[],
  enRepo: ReadonlySet<string>,
): RegistroMigracion[] {
  return registros.filter(
    (r) => r.finished_at === null && r.rolled_back_at === null && !enRepo.has(r.migration_name),
  );
}
