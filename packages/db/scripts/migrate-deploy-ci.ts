// `prisma migrate deploy` con guardas de CI: preview solo en `preview/pr-N`; main/dev exigen respaldo reciente.
import "dotenv/config";
import { execSync, spawnSync } from "node:child_process";

import { RAMA_PREVIEW } from "@opai/domain";

import {
  esBaseLocal,
  exigirPreviewCoherente,
  exigirRespaldoAntesDeProtegida,
  hayRespaldoReciente,
  hostDeUrl,
  resolverRamaNeonPorHost,
  ramaNeonProtegida,
  urlConLockTimeoutSesion,
  type RamaNeon,
} from "./migrate-deploy-guardas";

function neonctlBin(): string {
  return process.env["NEONCTL"] ?? "neonctl@8.12.1";
}

function credencialesNeon(): { api: string; proyecto: string; neonctl: string } {
  const api = process.env["NEON_API_KEY"];
  const proyecto = process.env["NEON_PROJECT_ID"];
  if (!api || !proyecto) {
    throw new Error(
      "Migración Neon: faltan NEON_API_KEY o NEON_PROJECT_ID para verificar respaldo y rama.",
    );
  }
  return { api, proyecto, neonctl: neonctlBin() };
}

function connectionStringRama(nombre: string, cred: { api: string; proyecto: string; neonctl: string }): string {
  return execSync(
    `npx --yes ${cred.neonctl} connection-string ${nombre} --project-id ${cred.proyecto} --pooled false`,
    { encoding: "utf8", env: { ...process.env, NEON_API_KEY: cred.api } },
  ).trim();
}

function listarRamasNeon(cred: { api: string; proyecto: string; neonctl: string }): {
  ramas: RamaNeon[];
  hosts: { name: string; host: string }[];
} {
  const salida = execSync(
    `npx --yes ${cred.neonctl} branches list --project-id ${cred.proyecto} --output json`,
    { encoding: "utf8", env: { ...process.env, NEON_API_KEY: cred.api } },
  );
  const ramas = JSON.parse(salida) as RamaNeon[];
  const hosts = ramas.map((r) => ({
    name: r.name,
    host: hostDeUrl(connectionStringRama(r.name, cred)),
  }));
  return { ramas, hosts };
}

function exigirMigracionSegura(url: string, ramaPreview: string): void {
  if (esBaseLocal(url)) {
    console.log("migrate deploy: base local efímera.");
    return;
  }
  const cred = credencialesNeon();

  if (RAMA_PREVIEW.test(ramaPreview)) {
    const cs = connectionStringRama(ramaPreview, cred);
    if (hostDeUrl(cs) !== hostDeUrl(url)) {
      throw new Error(
        `DATABASE_URL_MIGRATE no coincide con la rama Neon «${ramaPreview}».`,
      );
    }
    exigirPreviewCoherente(ramaPreview, ramaPreview);
    console.log(`migrate deploy: rama de preview ${ramaPreview}.`);
    return;
  }

  const { ramas, hosts } = listarRamasNeon(cred);
  const ramaNeon = resolverRamaNeonPorHost(hostDeUrl(url), hosts);

  if (ramaNeon && ramaNeonProtegida(ramaNeon)) {
    exigirRespaldoAntesDeProtegida(ramas, ramaNeon);
    console.log(`migrate deploy: rama protegida ${ramaNeon} con respaldo verificado.`);
    return;
  }

  if (!hayRespaldoReciente(ramas, 48 * 60 * 60 * 1000)) {
    throw new Error(
      "Migración Neon fuera de preview: no hay respaldo-* reciente (48 h). No migre main/dev sin respaldo.",
    );
  }
  if (ramaNeon?.startsWith("preview/")) {
    throw new Error(
      `Migración en rama preview «${ramaNeon}» sin PREVIEW_RAMA. Defina PREVIEW_RAMA=preview/pr-N.`,
    );
  }
  console.log(`migrate deploy: Neon (rama ${ramaNeon ?? "desconocida"}) con respaldo reciente.`);
}

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL_MIGRATE"];
  if (!url) throw new Error("Falta DATABASE_URL_MIGRATE.");
  const ramaPreview = process.env["PREVIEW_RAMA"] ?? "";
  exigirMigracionSegura(url, ramaPreview);
  const urlMigrar = urlConLockTimeoutSesion(url);
  process.env["DATABASE_URL_MIGRATE"] = urlMigrar;
  if (process.env["DATABASE_URL"]) {
    process.env["DATABASE_URL"] = urlConLockTimeoutSesion(process.env["DATABASE_URL"]);
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