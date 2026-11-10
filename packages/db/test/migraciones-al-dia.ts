// ¿La base de tests ya tiene aplicadas exactamente las migraciones del repo? Cada archivo `*-db.test.ts` llama a
// `prepararEntorno`, y `pnpm exec prisma migrate deploy` cuesta 1–3 s aunque no haya nada pendiente; con ~230
// archivos eso era casi la mitad del job `test:db` de CI (rozaba su tope de 20 min). Si cada carpeta de
// `prisma/migrations` está en `_prisma_migrations` con el mismo checksum (SHA-256 de su `migration.sql`, el que
// guarda Prisma), terminada y sin revertir, `migrate deploy` no haría nada y se omite. Ante cualquier duda (tabla sin
// crear, una migración nueva o editada, error de consulta) devuelve false y se corre `migrate deploy` como antes.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const CARPETA = new URL("../prisma/migrations", import.meta.url).pathname;

/** Checksum de cada migración del repo, por nombre de carpeta. */
export function migracionesDelRepo(carpeta = CARPETA): Map<string, string> {
  const out = new Map<string, string>();
  for (const nombre of readdirSync(carpeta)) {
    const sql = join(carpeta, nombre, "migration.sql");
    if (existsSync(sql)) out.set(nombre, createHash("sha256").update(readFileSync(sql)).digest("hex"));
  }
  return out;
}

/** true solo si la base tiene aplicadas todas las migraciones del repo, sin cambios. */
export async function migracionesAlDia(url: string, repo = migracionesDelRepo()): Promise<boolean> {
  const pg = new Client({ connectionString: url });
  try {
    await pg.connect();
    const r = await pg.query<{ migration_name: string; checksum: string }>(
      `SELECT migration_name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    const aplicadas = new Map(r.rows.map((f) => [f.migration_name, f.checksum]));
    return repo.size > 0 && [...repo].every(([nombre, checksum]) => aplicadas.get(nombre) === checksum);
  } catch {
    return false;
  } finally {
    await pg.end().catch(() => undefined);
  }
}
