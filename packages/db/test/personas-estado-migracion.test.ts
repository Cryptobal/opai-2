// CAR-674: migración activa→activo, inactiva→inactivo.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20271119132200_core_personas_estado_reclutamiento";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

describe.skipIf(!urlPropietario)("migración estados persona (CAR-674)", () => {
  it("mapea activa e inactiva y rechaza valores desconocidos", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_estado_mig_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE DATABASE "${nombre}"`);
    const url = new URL(urlPropietario!);
    url.pathname = `/${nombre}`;
    const pg = new Client({ connectionString: url.toString() });
    try {
      await pg.connect();
      const previas = (await readdir(carpeta, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && d.name < MIGRACION)
        .map((d) => d.name)
        .sort();
      for (const m of previas) await pg.query(await sql(m));
      await pg.query(
        `INSERT INTO core.tenants (id, slug, nombre, vertical, estado, created_at, updated_at)
         VALUES ($1, $2, 'T', 'seguridad', 'activo', now(), now())`,
        [randomUUID(), `t-${randomUUID().slice(0, 8)}`],
      );
      const tenantId = (await pg.query(`SELECT id FROM core.tenants LIMIT 1`)).rows[0].id;
      await pg.query(
        `INSERT INTO core.personas (id, tenant_id, nombres, apellidos, rut, estado, created_at, updated_at) VALUES
         ($2, $1, 'A', 'Uno', '11111111-1', 'activa', now(), now()),
         ($3, $1, 'B', 'Dos', '22222222-2', 'inactiva', now(), now())`,
        [tenantId, randomUUID(), randomUUID()],
      );
      await pg.query(await sql(MIGRACION));
      const rows = await pg.query(`SELECT estado FROM core.personas ORDER BY rut`);
      expect(rows.rows.map((r: { estado: string }) => r.estado).sort()).toEqual([
        "activo",
        "inactivo",
      ]);
    } finally {
      await pg.end().catch(() => undefined);
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}"`);
      await admin.end().catch(() => undefined);
    }
  });
});