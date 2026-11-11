// Destraba la rama Neon de PREVIEW de un PR antes de `prisma migrate deploy` (workflow `preview`).
// Una migración renombrada después de aplicarse en esa rama deja un registro fallido con el nombre
// viejo y Prisma rechaza todo deploy (P3009). Aquí ese registro se marca revertido, igual que
// `prisma migrate resolve --rolled-back`, solo si su migración ya no existe en el repo.
// Si la migración renombrada ya había TERMINADO con el nombre viejo, el registro toma el nombre nuevo
// (mismo checksum) y el intento fallido con el nombre nuevo se marca revertido.
// Se niega a correr fuera de una rama `preview/pr-N` (PREVIEW_RAMA): nunca toca main ni dev.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { Client } from "pg";

import {
  fallidasHuerfanas,
  RAMA_PREVIEW,
  type RegistroAplicado,
  renombradas,
} from "./preview-huerfanas-reglas";

const CARPETA = new URL("../prisma/migrations/", import.meta.url);

async function main(): Promise<void> {
  const rama = process.env["PREVIEW_RAMA"] ?? "";
  const url = process.env["DATABASE_URL_MIGRATE"];
  if (!RAMA_PREVIEW.test(rama)) {
    throw new Error(`Solo corre en una rama Neon de preview (preview/pr-N); recibió «${rama}».`);
  }
  if (!url) throw new Error("Falta DATABASE_URL_MIGRATE.");
  const checksums = new Map(
    readdirSync(CARPETA, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => {
        const sql = readFileSync(new URL(`${d.name}/migration.sql`, CARPETA));
        return [d.name, createHash("sha256").update(sql).digest("hex")] as const;
      }),
  );
  const enRepo = new Set(checksums.keys());
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const tabla = await client.query("SELECT to_regclass('public._prisma_migrations') AS t");
    if (!tabla.rows[0]?.t) {
      console.log("Rama sin migraciones previas: nada que destrabar.");
      return;
    }
    const { rows } = await client.query<RegistroAplicado>(
      "SELECT id, migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations",
    );
    for (const r of renombradas(rows, checksums)) {
      await client.query("BEGIN");
      await client.query(
        `UPDATE public._prisma_migrations SET rolled_back_at = now()
          WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
        [r.hacia],
      );
      await client.query(
        "UPDATE public._prisma_migrations SET migration_name = $2 WHERE id = $1 AND migration_name = $3",
        [r.id, r.hacia, r.desde],
      );
      await client.query("COMMIT");
      console.log(`Renombrada (mismo checksum, ya aplicada): ${r.desde} → ${r.hacia}`);
    }
    const huerfanas = fallidasHuerfanas(rows, enRepo);
    for (const r of huerfanas) {
      await client.query(
        `UPDATE public._prisma_migrations SET rolled_back_at = now()
          WHERE id = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
        [r.id],
      );
      console.log(`Marcada como revertida (ya no existe en el repo): ${r.migration_name}`);
    }
    if (!huerfanas.length) console.log("Sin migraciones fallidas huérfanas.");
  } finally {
    await client.end();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
