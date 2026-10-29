// CAR-36 (pendiente de la revisión del PR #109): la rama Neon `preview/pr-109` aplicó una versión
// vieja de la migración con la carpeta `20261028230000_…` (sin `agente_interno_id` ni la limpieza
// de eventos y envíos) y después la actual `20261028235000_…`. `CREATE TABLE IF NOT EXISTS` no
// valida el esquema de una tabla que ya existe: este test comprueba que, frente a la versión
// vieja que según el diagnóstico del #109 quedó en esa rama, el esquema final es igual al de aplicar
// la actual desde cero.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const VIEJA = "20261028230000_plataforma_aprobaciones_auditoria";
const ACTUAL = "20261028235000_plataforma_aprobaciones_auditoria";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");
const sqlVieja = () => readFile(new URL(`fixtures/car36-${VIEJA}.sql`, import.meta.url), "utf8");

const SISTEMA = "('pg_catalog', 'information_schema', 'pg_toast')";

/**
 * Esquema comparable, sin `ordinal_position`: en el reintento `agente_interno_id` se agrega con
 * `ADD COLUMN IF NOT EXISTS` y queda al final de la tabla; Prisma nombra las columnas, así que el
 * orden físico no cambia el comportamiento.
 */
const CONSULTAS = [
  `SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable,
     column_default, character_maximum_length, numeric_precision, datetime_precision
   FROM information_schema.columns WHERE table_schema NOT IN ${SISTEMA}`,
  `SELECT n.nspname, c.conrelid::regclass::text AS tabla, c.conname, pg_get_constraintdef(c.oid)
   FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
   WHERE n.nspname NOT IN ${SISTEMA}`,
  `SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
   WHERE schemaname NOT IN ${SISTEMA}`,
  `SELECT n.nspname, p.proname, pg_get_functiondef(p.oid), p.prosecdef, p.proconfig::text,
     p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname NOT IN ${SISTEMA} AND p.prokind = 'f'`,
  `SELECT grantee, table_schema, table_name, privilege_type
   FROM information_schema.table_privileges WHERE table_schema NOT IN ${SISTEMA}`,
  `SELECT n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname NOT IN ${SISTEMA} AND c.relkind IN ('r', 'p', 'v', 'm', 'S')`,
  `SELECT schemaname, tablename, policyname, permissive, roles::text, cmd, qual, with_check
   FROM pg_policies WHERE schemaname NOT IN ${SISTEMA}`,
  `SELECT n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid)
   FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE NOT t.tgisinternal AND n.nspname NOT IN ${SISTEMA}`,
];

async function esquema(pg: Client): Promise<string[]> {
  const lineas: string[] = [];
  for (const [i, q] of CONSULTAS.entries()) {
    const { rows } = await pg.query<Record<string, unknown>>(q);
    for (const r of rows) lineas.push(`${i}|${JSON.stringify(Object.values(r))}`);
  }
  return lineas.sort();
}

async function conBase<T>(admin: Client, fn: (pg: Client) => Promise<T>): Promise<T> {
  const nombre = `opai_car36_rein_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE DATABASE "${nombre}"`);
  const url = new URL(urlPropietario!);
  url.pathname = `/${nombre}`;
  const pg = new Client({ connectionString: url.toString() });
  try {
    await pg.connect();
    return await fn(pg);
  } finally {
    await pg.end();
    await admin.query(`DROP DATABASE "${nombre}" WITH (FORCE)`);
  }
}

describe.skipIf(!urlPropietario)("reintento de la migración de plataforma (CAR-36)", () => {
  it("la versión vieja (20261028230000) y luego la actual dejan el mismo esquema que la actual sola", async () => {
    const todas = (await readdir(carpeta, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && d.name <= ACTUAL)
      .map((d) => d.name)
      .sort();
    expect(todas.at(-1)).toBe(ACTUAL);
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    try {
      const desdeCero = await conBase(admin, async (pg) => {
        for (const m of todas) await pg.query(await sql(m));
        return esquema(pg);
      });
      // Orden de `preview/pr-109`: la vieja entró antes que 20261028234500 (#113), con su nombre.
      const conReintento = await conBase(admin, async (pg) => {
        for (const m of todas.filter((n) => n < VIEJA)) await pg.query(await sql(m));
        await pg.query(await sqlVieja());
        const sinColumna = await pg.query(
          `SELECT 1 FROM information_schema.columns WHERE table_schema = 'core'
             AND table_name = 'aprobaciones_plataforma' AND column_name = 'agente_interno_id'`,
        );
        expect(sinColumna.rowCount).toBe(0);
        for (const m of todas.filter((n) => n > VIEJA)) await pg.query(await sql(m));
        return esquema(pg);
      });
      expect(desdeCero.some((l) => l.includes("agente_interno_id"))).toBe(true);
      expect(conReintento).toEqual(desdeCero);
    } finally {
      await admin.end();
    }
  }, 300_000);
});
