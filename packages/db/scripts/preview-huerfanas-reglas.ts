// Reglas puras de `preview-huerfanas.ts` (sin base): qué rama se acepta y qué registros se destraban.

export { RAMA_PREVIEW } from "@opai/domain";

export type RegistroMigracion = {
  id: string;
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

/**
 * Registros fallidos (sin terminar ni revertidos) cuya migración ya no existe en el repo: típico de una
 * migración renombrada después de aplicarse en la rama de preview, que deja a Prisma en P3009. Una
 * migración fallida que sigue en el repo con el mismo checksum no se toca: ese fallo es real.
 */
export function fallidasHuerfanas(
  registros: readonly RegistroMigracion[],
  enRepo: ReadonlySet<string>,
): RegistroMigracion[] {
  return registros.filter(
    (r) => r.finished_at === null && r.rolled_back_at === null && !enRepo.has(r.migration_name),
  );
}

/**
 * Registros fallidos cuya migración sigue en el repo pero el `migration.sql` cambió (checksum distinto):
 * tras corregir el SQL en un push siguiente, la rama de preview reutilizada queda en P3009 hasta marcar revertido.
 */
export function fallidasConSqlCorregido(
  registros: readonly RegistroAplicado[],
  checksumsRepo: ReadonlyMap<string, string>,
): RegistroAplicado[] {
  return registros.filter(
    (r) =>
      r.finished_at === null &&
      r.rolled_back_at === null &&
      checksumsRepo.has(r.migration_name) &&
      checksumsRepo.get(r.migration_name) !== r.checksum,
  );
}

export type RegistroAplicado = RegistroMigracion & { checksum: string };
export type Renombre = { id: string; desde: string; hacia: string };

/**
 * Migraciones renombradas después de aplicarse en la preview: un registro TERMINADO cuyo nombre ya no
 * está en el repo y cuyo checksum (sha256 del SQL, el mismo de Prisma) es idéntico al de una migración
 * del repo que la rama no tiene terminada. El SQL ya corrió con el nombre viejo; reaplicarlo con el
 * nuevo fallaría («ya existe»). Solo se propone si el checksum calza con UNA sola migración del repo y un solo registro viejo.
 */
export function renombradas(
  registros: readonly RegistroAplicado[],
  checksumsRepo: ReadonlyMap<string, string>,
): Renombre[] {
  const terminadas = new Set(
    registros.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name),
  );
  const propuestos: Renombre[] = [];
  for (const r of registros) {
    if (!r.finished_at || r.rolled_back_at || checksumsRepo.has(r.migration_name)) continue;
    // La ambigüedad se mide en TODO el repo: si el SQL calza con más de una migración, no se toca.
    const calces = [...checksumsRepo].filter(([, suma]) => suma === r.checksum);
    const destino = calces.length === 1 ? calces[0] : undefined;
    if (destino && !terminadas.has(destino[0])) {
      propuestos.push({ id: r.id, desde: r.migration_name, hacia: destino[0] });
    }
  }
  // Dos registros viejos hacia el mismo destino también son ambiguos: se descartan ambos.
  return propuestos.filter((p) => propuestos.filter((q) => q.hacia === p.hacia).length === 1);
}
