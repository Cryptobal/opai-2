// Destraba la rama Neon de PREVIEW de un PR antes de `prisma migrate deploy` (workflow `preview`).
// Una migración renombrada después de aplicarse en esa rama deja un registro fallido con el nombre
// viejo y Prisma rechaza todo deploy (P3009). Aquí ese registro se marca revertido, igual que
// `prisma migrate resolve --rolled-back`, solo si su migración ya no existe en el repo.
// Se niega a correr fuera de una rama `preview/pr-N` (PREVIEW_RAMA): nunca toca main ni dev.
import { readdirSync } from "node:fs";
import { Client } from "pg";

import {
  fallidasHuerfanas,
  RAMA_PREVIEW,
  type RegistroMigracion,
} from "./preview-huerfanas-reglas";

const CARPETA = new URL("../prisma/migrations/", import.meta.url);

async function main(): Promise<void> {
  const rama = process.env["PREVIEW_RAMA"] ?? "";
  const url = process.env["DATABASE_URL_MIGRATE"];
  if (!RAMA_PREVIEW.test(rama)) {
    throw new Error(`Solo corre en una rama Neon de preview (preview/pr-N); recibió «${rama}».`);
  }
  if (!url) throw new Error("Falta DATABASE_URL_MIGRATE.");
  const enRepo = new Set(
    readdirSync(CARPETA, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const tabla = await client.query("SELECT to_regclass('public._prisma_migrations') AS t");
    if (!tabla.rows[0]?.t) {
      console.log("Rama sin migraciones previas: nada que destrabar.");
      return;
    }
    const { rows } = await client.query<RegistroMigracion>(
      "SELECT id, migration_name, finished_at, rolled_back_at FROM public._prisma_migrations",
    );
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
