// Entorno de los tests de base (Postgres real, DATABASE_URL_TEST con rol propietario).
// Aplica las migraciones y crea un rol de prueba efímero equivalente a opai_app (miembro de
// opai_app, sin BYPASSRLS) para no tocar la contraseña real del rol de aplicación.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "pg";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

export const urlPropietario = process.env["DATABASE_URL_TEST"];

/** Una sola ALTER ROLE por base de tests: workers de Vitest comparten contraseña vía archivo + advisory lock. */
let passwordCronSiiLista: Promise<string> | undefined;
const marcadorPasswordCronSii = join(tmpdir(), "opai_cron_sii_test_pwd");
const lockPasswordCronSii = 148_148;

async function fijarPasswordCronSii(connectionString: string): Promise<string> {
  if (!passwordCronSiiLista) {
    passwordCronSiiLista = (async () => {
      const pg = new Client({ connectionString });
      await pg.connect();
      await pg.query("SELECT pg_advisory_lock($1)", [lockPasswordCronSii]);
      try {
        if (existsSync(marcadorPasswordCronSii)) {
          return readFileSync(marcadorPasswordCronSii, "utf8");
        }
        const cronPassword = randomBytes(24).toString("base64url");
        await pg.query(
          `ALTER ROLE opai_cron_sii WITH LOGIN PASSWORD ${pg.escapeLiteral(cronPassword)}`,
        );
        writeFileSync(marcadorPasswordCronSii, cronPassword, { mode: 0o600 });
        return cronPassword;
      } finally {
        await pg.query("SELECT pg_advisory_unlock($1)", [lockPasswordCronSii]);
        await pg.end();
      }
    })();
  }
  return passwordCronSiiLista;
}

/** En local sin Postgres se omiten suites db; en CI deben fallar si falta la URL. */
export function omitirSuiteDb(): boolean {
  if (urlPropietario?.trim()) return false;
  return !process.env.CI;
}

function urlParaRol(url: string, usuario: string, password: string): string {
  const u = new URL(url);
  u.username = usuario;
  u.password = password;
  return u.toString();
}

export async function prepararEntorno() {
  const url = urlPropietario?.trim();
  if (!url) throw new Error("Falta DATABASE_URL_TEST: RLS requiere Postgres real.");
  const password = randomBytes(24).toString("base64url");
  const rol = `opai_test_${randomUUID().slice(0, 8).replace(/-/g, "")}`;
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL_MIGRATE: url },
    stdio: "pipe",
  });
  // Las políticas aplican "TO opai_app", que cubre a sus miembros.
  const pg = new Client({ connectionString: url });
  await pg.connect();
  await pg.query(
    `CREATE ROLE ${rol} LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT IN ROLE opai_app PASSWORD ${pg.escapeLiteral(password)}`,
  );
  await pg.end();
  const cronPassword = await fijarPasswordCronSii(url);

  process.env["DATABASE_URL"] = urlParaRol(url, rol, password);
  process.env["DATABASE_URL_MIGRATE"] = url;
  process.env["DATABASE_URL_CRON_SII"] = urlParaRol(url, "opai_cron_sii", cronPassword);
  const { forTenant } = await import("../src/for-tenant");
  const { forUser } = await import("../src/for-user");
  const { cerrarClientes } = await import("../src/client");

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const appSinTenant = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] }),
  });

  async function cerrar(): Promise<void> {
    await admin.$disconnect();
    await appSinTenant.$disconnect();
    await cerrarClientes();
    const fin = new Client({ connectionString: url });
    await fin.connect();
    await fin.query(`DROP ROLE IF EXISTS ${rol}`);
    await fin.end();
  }

  return { admin, appSinTenant, forTenant, forUser, cerrar };
}

export type Entorno = Awaited<ReturnType<typeof prepararEntorno>>;
