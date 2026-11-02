import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20261102220000_cpq_propuesta_tecnica";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

/** SQL de reversión comentado al final de migration.sql (sin copias locales). */
function reversionManual(contenido: string): string {
  const idx = contenido.indexOf("-- Reversión");
  if (idx < 0) throw new Error("falta sección de reversión");
  return contenido
    .slice(idx)
    .split("\n")
    .slice(1)
    .filter((linea) => linea.startsWith("-- "))
    .map((linea) => linea.slice(3))
    .join("\n");
}

describe.skipIf(!urlPropietario)("migración CPQ propuesta técnica (CAR-144)", () => {
  it("aplica, revierte y vuelve a aplicar", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_cpq_pt_mig_${randomUUID().replaceAll("-", "")}`;
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
      const migracion = await sql(MIGRACION);
      await pg.query(migracion);
      const tablas = (
        await pg.query<{ tablename: string }>(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'cpq' AND tablename IN ('propuesta_envios','propuestas_tecnicas','biblioteca_bloques') ORDER BY tablename`,
        )
      ).rows.map((r) => r.tablename);
      expect(tablas).toEqual(["biblioteca_bloques", "propuesta_envios", "propuestas_tecnicas"]);
      await pg.query(reversionManual(migracion));
      const trasDown = (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'cpq' AND tablename = 'propuesta_envios'`,
        )
      ).rows[0]?.n;
      expect(trasDown).toBe(0);
      await pg.query(migracion);
      const otraVez = (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'cpq' AND tablename = 'propuesta_envios'`,
        )
      ).rows[0]?.n;
      expect(otraVez).toBe(1);
    } finally {
      await pg.end().catch(() => undefined);
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
      await admin.end();
    }
  }, 120_000);
});
