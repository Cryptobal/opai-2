// Entorno de los tests de base (Postgres real, DATABASE_URL_TEST con rol propietario).
// Aplica las migraciones y crea un rol de prueba efímero equivalente a opai_app (miembro de
// opai_app, sin BYPASSRLS) para no tocar la contraseña real del rol de aplicación.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

export const urlPropietario = process.env["DATABASE_URL_TEST"];

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

  process.env["DATABASE_URL"] = urlParaRol(url, rol, password);
  process.env["DATABASE_URL_MIGRATE"] = url;
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
