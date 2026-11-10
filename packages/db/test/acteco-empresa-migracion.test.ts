// CAR-243 · La migración lleva el ACTECO de `finanzas.dte_config` al perfil de la empresa sin perderlo: completa un perfil
// sin ACTECO, crea el perfil si falta, respeta la lista que la empresa ya eligió y no toca `dte_config.acteco`.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20261119100000_core_empresa_actecos";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

describe.skipIf(!urlPropietario)("migración del ACTECO a la empresa (CAR-243)", () => {
  it("copia el ACTECO de la configuración DTE como principal, sin perderlo ni pisar lo elegido", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_acteco_mig_${randomUUID().replaceAll("-", "")}`;
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
      // Sin las FK a tenants: el test solo mira perfil_empresa y dte_config.
      await pg.query("SET session_replication_role = replica");
      const [conPerfil, sinPerfil, sinActeco] = [randomUUID(), randomUUID(), randomUUID()];
      for (const [tenant, acteco] of [
        [conPerfil, 801001],
        [sinPerfil, 829900],
        [sinActeco, null],
      ] as const) {
        await pg.query(
          `INSERT INTO finanzas.dte_config (id, tenant_id, acteco, created_at, updated_at) VALUES ($1, $2, $3, now(), now())`,
          [randomUUID(), tenant, acteco],
        );
      }
      await pg.query(
        `INSERT INTO core.perfil_empresa (id, tenant_id, razon_social, created_at, updated_at) VALUES ($1, $2, 'Empresa Ficticia SpA', now(), now())`,
        [randomUUID(), conPerfil],
      );
      await pg.query(await sql(MIGRACION));

      const perfiles = await pg.query<{ tenant_id: string; actecos: number[]; acteco_principal: number | null; razon_social: string | null }>(
        "SELECT tenant_id, actecos, acteco_principal, razon_social FROM core.perfil_empresa",
      );
      const de = (t: string) => perfiles.rows.find((r) => r.tenant_id === t);
      expect(de(conPerfil)).toMatchObject({ actecos: [801001], acteco_principal: 801001, razon_social: "Empresa Ficticia SpA" });
      expect(de(sinPerfil)).toMatchObject({ actecos: [829900], acteco_principal: 829900, razon_social: null });
      expect(de(sinActeco)).toBeUndefined();
      // La columna heredada sigue con su dato.
      const dte = await pg.query<{ acteco: number | null }>("SELECT acteco FROM finanzas.dte_config ORDER BY acteco NULLS LAST");
      expect(dte.rows.map((r) => r.acteco)).toEqual([801001, 829900, null]);

      // El CHECK rechaza un principal fuera de la lista.
      await expect(
        pg.query(`UPDATE core.perfil_empresa SET acteco_principal = 111111 WHERE tenant_id = $1`, [conPerfil]),
      ).rejects.toThrow(/perfil_empresa_actecos_chk/);
    } finally {
      await pg.end();
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
      await admin.end();
    }
  }, 180_000);
});
