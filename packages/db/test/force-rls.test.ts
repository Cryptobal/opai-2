import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, urlPropietario, type Entorno } from "./entorno";

describe("FORCE RLS sobre el dueño NOBYPASSRLS", () => {
  let entorno: Entorno;
  beforeAll(async () => {
    entorno = await prepararEntorno();
  });
  afterAll(async () => {
    await entorno?.cerrar();
  });

  it("aplica la migración dos veces y aísla al dueño en un schema de módulo", async () => {
    const pg = new Client({ connectionString: urlPropietario });
    const nombre = `g2_${randomUUID().replaceAll("-", "")}`;
    const a = randomUUID();
    const b = randomUUID();
    await pg.connect();
    try {
      await pg.query("BEGIN");
      await pg.query(`CREATE ROLE ${nombre} NOBYPASSRLS NOSUPERUSER IN ROLE opai_app`);
      await pg.query(`CREATE SCHEMA ${nombre} AUTHORIZATION ${nombre}`);
      await pg.query(`CREATE TABLE ${nombre}.filas (tenant_id uuid NOT NULL)`);
      await pg.query(`ALTER TABLE ${nombre}.filas OWNER TO ${nombre}`);
      await pg.query(`INSERT INTO ${nombre}.filas VALUES ($1), ($2)`, [a, b]);
      await pg.query(`ALTER TABLE ${nombre}.filas ENABLE ROW LEVEL SECURITY`);
      await pg.query(`CREATE POLICY tenant_isolation ON ${nombre}.filas TO opai_app
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)`);
      await pg.query(`SET LOCAL ROLE ${nombre}`);
      expect((await pg.query(`SELECT * FROM ${nombre}.filas`)).rowCount).toBe(2);
      await pg.query("RESET ROLE");
      const sql = readFileSync(
        new URL("../prisma/migrations/20261028160000_force_rls/migration.sql", import.meta.url),
        "utf8",
      );
      await pg.query(sql);
      await pg.query(sql);
      await pg.query(`SET LOCAL ROLE ${nombre}`);
      expect((await pg.query(`SELECT * FROM ${nombre}.filas`)).rowCount).toBe(0);
      await pg.query("SELECT set_config('app.tenant_id', $1, true)", [a]);
      expect((await pg.query(`SELECT tenant_id FROM ${nombre}.filas`)).rows).toEqual([
        { tenant_id: a },
      ]);
      expect(
        (await pg.query(`UPDATE ${nombre}.filas SET tenant_id = $1 WHERE tenant_id = $2`, [a, b]))
          .rowCount,
      ).toBe(0);
      await expect(pg.query(`INSERT INTO ${nombre}.filas VALUES ($1)`, [b])).rejects.toThrow(
        /row-level security/,
      );
    } finally {
      await pg.query("ROLLBACK");
      await pg.end();
    }
  });

  it("revierte exactamente las tablas forzadas salvo las dos preexistentes", async () => {
    const pg = new Client({ connectionString: urlPropietario });
    await pg.connect();
    try {
      await pg.query("BEGIN");
      const sql = readFileSync(
        new URL("../prisma/migrations/20261028160000_force_rls/migration.sql", import.meta.url),
        "utf8",
      );
      const catalogo = await pg.query(`
        SELECT DISTINCT schemaname, tablename FROM pg_policies
        WHERE policyname = 'tenant_isolation' ORDER BY schemaname, tablename
      `);
      await pg.query(sql);
      const reversion = sql
        .split("-- Reversión (manual, solo referencia; no la aplica Prisma)")[1]!
        .split("\n")
        .filter((linea) => linea.startsWith("--   "))
        .map((linea) => linea.slice(5))
        .join("\n");
      const tablasRevertidas = [...reversion.matchAll(/ALTER TABLE "([^"]+)"\."([^"]+)" NO FORCE/g)]
        .map(([, schema, tabla]) => `${schema}.${tabla}`)
        .sort();
      expect(tablasRevertidas).toEqual(
        catalogo.rows
          .map(({ schemaname, tablename }) => `${schemaname}.${tablename}`)
          .filter((tabla) => !["core.gasto_agente_mes", "core.auditoria_cabezas"].includes(tabla))
          .sort(),
      );
      await pg.query(reversion);
      for (const { schemaname, tablename } of catalogo.rows) {
        const { rows } = await pg.query(
          `
          SELECT relforcerowsecurity FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1 AND c.relname = $2
        `,
          [schemaname, tablename],
        );
        expect(rows[0].relforcerowsecurity, `${schemaname}.${tablename}`).toBe(
          schemaname === "core" && ["gasto_agente_mes", "auditoria_cabezas"].includes(tablename),
        );
      }
      const { rows } = await pg.query(`
        SELECT proname, prosecdef, proconfig FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'core'
        AND proname IN ('verificar_mismo_tenant', 'puesto_ciclo_del_patron', 'patron_en_uso_inmutable')
      `);
      expect(rows).toHaveLength(3);
      for (const funcion of rows) {
        expect(funcion.prosecdef).toBe(true);
        expect(funcion.proconfig).toContain("search_path=pg_catalog, pg_temp");
      }
    } finally {
      await pg.query("ROLLBACK");
      await pg.end();
    }
  });

  it("opai_app nunca es superusuario ni BYPASSRLS", async () => {
    const pg = new Client({ connectionString: urlPropietario });
    await pg.connect();
    try {
      const { rows } = await pg.query(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'opai_app'",
      );
      expect(rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
    } finally {
      await pg.end();
    }
  });
});
