// CAR-559: la migración de datos solo corrige abiertos con el % de la primera etapa en otra etapa.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20270123160000_comercial_negocios_probabilidad_etapa";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

describe.skipIf(!urlPropietario)("migración probabilidad negocios (CAR-559)", () => {
  it("corrige el desfase conservador, respeta ediciones y es idempotente", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_prob_mig_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE DATABASE "${nombre}"`);
    const url = new URL(urlPropietario!);
    url.pathname = `/${nombre}`;
    const pg = new Client({ connectionString: url.toString() });
    const id = () => randomUUID();
    try {
      await pg.connect();
      const previas = (await readdir(carpeta, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && d.name < MIGRACION)
        .map((d) => d.name)
        .sort();
      for (const m of previas) await pg.query(await sql(m));
      await pg.query("SET session_replication_role = replica");
      const tenant = id();
      const embudo = id();
      const e0 = id();
      const e3 = id();
      const cuenta = id();
      const ganada = id();
      await pg.query(
        `INSERT INTO core.tenants (id, slug, nombre, vertical, updated_at) VALUES ($1, $2, 'T', 'seguridad', now())`,
        [tenant, `prob-${tenant.slice(0, 8)}`],
      );
      await pg.query(
        `INSERT INTO core.cuentas (id, tenant_id, nombre, estado) VALUES ($1, $2, 'Cuenta', 'prospecto')`,
        [cuenta, tenant],
      );
      await pg.query(
        `INSERT INTO comercial.embudos (id, tenant_id, nombre, por_defecto, activo) VALUES ($1, $2, 'V', true, true)`,
        [embudo, tenant],
      );
      await pg.query(
        `INSERT INTO comercial.etapas (id, tenant_id, embudo_id, nombre, orden, tipo, probabilidad, tono, exige, activa)
         VALUES ($1, $2, $3, 'Prospecto', 0, 'abierta', 10, 'neutral', '{}', true),
                ($4, $2, $3, 'Propuesta enviada', 3, 'abierta', 50, 'warning', '{}', true),
                ($5, $2, $3, 'Adjudicado', 6, 'ganada', 100, 'success', '{}', true)`,
        [e0, tenant, embudo, e3, ganada],
      );
      const stale = id();
      const manual = id();
      const ok = id();
      const primera = id();
      const cerrado = id();
      const ins = async (nid: string, etapa: string, prob: number, estado: string) => {
        await pg.query(
          `INSERT INTO comercial.negocios (id, tenant_id, cuenta_id, embudo_id, etapa_id, estado, titulo, probabilidad)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [nid, tenant, cuenta, embudo, etapa, estado, `N-${nid.slice(0, 6)}`, prob],
        );
      };
      await ins(stale, e3, 10, "abierto");
      await ins(manual, e3, 15, "abierto");
      await ins(ok, e3, 50, "abierto");
      await ins(primera, e0, 10, "abierto");
      await ins(cerrado, ganada, 10, "ganado");
      await pg.query(await sql(MIGRACION));
      const lee = async () =>
        Object.fromEntries(
          (
            await pg.query<{ id: string; probabilidad: number }>(
              `SELECT id, probabilidad FROM comercial.negocios WHERE tenant_id = $1`,
              [tenant],
            )
          ).rows.map((r) => [r.id, r.probabilidad]),
        );
      const probs = await lee();
      expect(probs).toEqual({
        [stale]: 50,
        [manual]: 15,
        [ok]: 50,
        [primera]: 10,
        [cerrado]: 10,
      });
      const trasPrimera = await lee();
      await pg.query(await sql(MIGRACION));
      expect(await lee()).toEqual(trasPrimera);
    } finally {
      await pg.end();
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
      await admin.end();
    }
  }, 180_000);
});