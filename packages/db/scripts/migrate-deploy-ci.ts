// `prisma migrate deploy` con guardas de CI: preview solo en `preview/pr-N`; Neon distinto exige respaldo reciente.
import "dotenv/config";
import { execSync, spawnSync } from "node:child_process";

import { RAMA_PREVIEW } from "@opai/domain";

const LOCAL = new Set(["localhost", "127.0.0.1"]);

function host(url: string): string {
  return new URL(url).hostname;
}

function esLocal(url: string): boolean {
  return LOCAL.has(host(url));
}

function exigirRespaldoNeon(): void {
  const api = process.env["NEON_API_KEY"];
  const proyecto = process.env["NEON_PROJECT_ID"];
  if (!api || !proyecto) {
    throw new Error(
      "Migración Neon fuera de preview: faltan NEON_API_KEY o NEON_PROJECT_ID para verificar respaldo.",
    );
  }
  const neonctl = process.env["NEONCTL"] ?? "neonctl@8.12.1";
  const salida = execSync(
    `npx --yes ${neonctl} branches list --project-id ${proyecto} --output json`,
    { encoding: "utf8", env: { ...process.env, NEON_API_KEY: api } },
  );
  const ramas = JSON.parse(salida) as { name: string; created_at: string }[];
  const hace48h = Date.now() - 48 * 60 * 60 * 1000;
  const hay = ramas.some((r) => {
    if (!/^respaldo-/i.test(r.name)) return false;
    return new Date(r.created_at).getTime() >= hace48h;
  });
  if (!hay) {
    throw new Error(
      "Migración Neon: no hay rama respaldo-* creada en las últimas 48 h. Cree un respaldo antes de migrar.",
    );
  }
  console.log("Respaldo Neon reciente verificado.");
}

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL_MIGRATE"];
  if (!url) throw new Error("Falta DATABASE_URL_MIGRATE.");
  const rama = process.env["PREVIEW_RAMA"] ?? "";
  if (esLocal(url)) {
    console.log("migrate deploy: base local efímera.");
  } else if (RAMA_PREVIEW.test(rama)) {
    console.log(`migrate deploy: rama de preview ${rama}.`);
  } else {
    exigirRespaldoNeon();
  }
  const cwd = new URL("../", import.meta.url).pathname;
  const r = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  process.exit(r.status === 0 ? 0 : r.status ?? 1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});