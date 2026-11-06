// CAR-193 (flujo C): la migración de datos del umbral lleva a $10.000.000 solo los ajustes que están exactamente en el
// defecto que dejó B1 ($15.000.000); lo que la empresa fijó a mano no se toca y la verificación de filas pasa.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20261107180000_finanzas_flujo_umbral_diez_millones";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

describe.skipIf(!urlPropietario)("migración del umbral de saldo bajo (CAR-193)", () => {
  it("lleva a 10.000.000 el 15.000.000 sin editar (incluido el que dejó B1), no toca lo editado a mano y cambia el defecto de la columna", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_umbral_mig_${randomUUID().replaceAll("-", "")}`;
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
      // Sin las FK a tenants: el test solo mira la columna `umbral`.
      await pg.query("SET session_replication_role = replica");
      // [umbral, created_at, updated_at]: sin tocar, llevado a 15M por B1 el 5-nov, editado después a mano, y otros valores.
      const filas: [number, string, string][] = [
        [15_000_000, "2026-11-05 10:00", "2026-11-05 10:00"],
        [15_000_000, "2026-10-01 10:00", "2026-11-05 20:00"],
        [15_000_000, "2026-10-01 10:00", "2026-11-08 09:00"],
        [2_000_000, "2026-10-01 10:00", "2026-10-02 10:00"],
        [10_000_000, "2026-10-01 10:00", "2026-10-02 10:00"],
      ];
      for (const [umbral, creado, actualizado] of filas) {
        await pg.query(
          `INSERT INTO finanzas.flujo_ajustes (id, tenant_id, umbral, desde, created_at, updated_at) VALUES ($1, $2, $3, '2026-11-02', $4::timestamptz, $5::timestamptz)`,
          [randomUUID(), randomUUID(), umbral, `${creado}-03`, `${actualizado}-03`],
        );
      }
      await pg.query(await sql(MIGRACION));
      const tras = (await pg.query<{ umbral: string }>("SELECT umbral::text FROM finanzas.flujo_ajustes ORDER BY umbral::bigint")).rows.map((r) => Number(r.umbral));
      expect(tras).toEqual([2_000_000, 10_000_000, 10_000_000, 10_000_000, 15_000_000]);
      const defecto = (
        await pg.query<{ d: string }>(
          `SELECT column_default AS d FROM information_schema.columns WHERE table_schema = 'finanzas' AND table_name = 'flujo_ajustes' AND column_name = 'umbral'`,
        )
      ).rows[0]?.d;
      expect(defecto).toContain("10000000");
    } finally {
      await pg.end();
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
      await admin.end();
    }
  }, 180_000);
});
