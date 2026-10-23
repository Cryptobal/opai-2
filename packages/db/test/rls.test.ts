// Test de aislamiento por tenant (ADR-002). Corre solo si existe DATABASE_URL_TEST
// (rama dev de Neon o Postgres local, con rol propietario). Aplica las migraciones,
// fija una contraseña temporal al rol opai_app y verifica que:
//   1. forTenant(A) ve solo A y forTenant(B) ve solo B;
//   2. el rol de aplicación sin tenant fijado ve cero filas;
//   3. forTenant(A) no puede escribir filas de B.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";

import { type cerrarClientes as CerrarClientes } from "../src/client";
import { type forTenant as ForTenant } from "../src/for-tenant";
import { PrismaClient } from "../src/generated/prisma/client";

const urlPropietario = process.env["DATABASE_URL_TEST"];

function urlParaRol(url: string, usuario: string, password: string): string {
  const u = new URL(url);
  u.username = usuario;
  u.password = password;
  return u.toString();
}

describe.skipIf(!urlPropietario)("aislamiento por tenant con RLS", () => {
  const password = randomBytes(24).toString("base64url");
  const slugA = `test-a-${randomUUID().slice(0, 8)}`;
  const slugB = `test-b-${randomUUID().slice(0, 8)}`;
  let admin: PrismaClient;
  let appSinTenant: PrismaClient;
  let forTenant: typeof ForTenant;
  let cerrarClientes: typeof CerrarClientes;
  let idA = "";
  let idB = "";

  beforeAll(async () => {
    const url = urlPropietario as string;
    execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: { ...process.env, DATABASE_URL_MIGRATE: url },
      stdio: "pipe",
    });
    const pg = new Client({ connectionString: url });
    await pg.connect();
    await pg.query(`ALTER ROLE opai_app WITH LOGIN PASSWORD ${pg.escapeLiteral(password)}`);
    await pg.end();

    process.env["DATABASE_URL"] = urlParaRol(url, "opai_app", password);
    process.env["DATABASE_URL_MIGRATE"] = url;
    ({ forTenant } = await import("../src/for-tenant"));
    ({ cerrarClientes } = await import("../src/client"));

    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    appSinTenant = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] }),
    });

    const a = await admin.tenant.create({
      data: { slug: slugA, nombre: "A", vertical: "seguridad" },
    });
    const b = await admin.tenant.create({ data: { slug: slugB, nombre: "B", vertical: "aseo" } });
    idA = a.id;
    idB = b.id;
    await admin.auditEvent.createMany({
      data: [
        { tenantId: idA, actorType: "system", capability: "test.a.1" },
        { tenantId: idA, actorType: "system", capability: "test.a.2" },
        { tenantId: idB, actorType: "system", capability: "test.b.1" },
      ],
    });
  });

  afterAll(async () => {
    if (admin) {
      await admin.auditEvent.deleteMany({ where: { tenantId: { in: [idA, idB] } } });
      await admin.tenant.deleteMany({ where: { id: { in: [idA, idB] } } });
      await admin.$disconnect();
    }
    await appSinTenant?.$disconnect();
    await cerrarClientes?.();
  });

  it("cada tenant ve solo sus filas", async () => {
    const deA = await forTenant(idA).auditEvent.findMany({ orderBy: { capability: "asc" } });
    const deB = await forTenant(idB).auditEvent.findMany();
    expect(deA.map((e) => e.capability)).toEqual(["test.a.1", "test.a.2"]);
    expect(deB.map((e) => e.capability)).toEqual(["test.b.1"]);
  });

  it("el rol de aplicación sin tenant fijado no ve nada", async () => {
    const filas = await appSinTenant.auditEvent.findMany();
    expect(filas).toHaveLength(0);
  });

  it("un tenant no puede escribir filas de otro", async () => {
    await expect(
      forTenant(idA).auditEvent.create({
        data: { tenantId: idB, actorType: "system", capability: "test.fuga" },
      }),
    ).rejects.toThrow();
    const deB = await admin.auditEvent.count({ where: { tenantId: idB } });
    expect(deB).toBe(1);
  });

  it("rechaza tenantId que no sea UUID", () => {
    expect(() => forTenant("gard")).toThrow(/UUID/);
  });
});
