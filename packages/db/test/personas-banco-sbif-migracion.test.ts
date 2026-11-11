// CAR-244: la migración convierte el banco y el tipo de cuenta escritos a mano a su código SBIF y valor canónico,
// en la cuenta vigente y en las solicitudes pendientes; lo que no reconoce queda igual (la ficha lo marca «por
// corregir») y las solicitudes ya resueltas no se tocan.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20261120100000_core_personas_pago_banco_sbif";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

describe.skipIf(!urlPropietario)("migración de bancos a código SBIF (CAR-244)", () => {
  it("convierte lo reconocible, deja lo demás para corrección y no toca solicitudes resueltas", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_banco_mig_${randomUUID().replaceAll("-", "")}`;
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
      // Sin las FK a tenants ni personas: el test solo mira banco y tipo de cuenta.
      await pg.query("SET session_replication_role = replica");
      const vigentes: [string, string, string][] = [
        ["Banco Estado", "Cuenta RUT", "012|rut"],
        ["Banco de Chile", "Cta. Corriente", "001|corriente"],
        ["santander", "vista", "037|vista"],
        ["Itaú", "Chequera electrónica", "039|vista"],
        ["037", "corriente", "037|corriente"],
        ["Banco Inventado", "Cuenta Mágica", "Banco Inventado|Cuenta Mágica"],
      ];
      for (const [banco, tipo] of vigentes) {
        await pg.query(
          `INSERT INTO core.personas_pago (id, tenant_id, persona_id, banco_codigo, tipo_cuenta, updated_at) VALUES ($1, $2, $3, $4, $5, now())`,
          [randomUUID(), randomUUID(), randomUUID(), banco, tipo],
        );
      }
      const solicitud = (estado: string) =>
        pg.query(
          `INSERT INTO core.personas_pago_solicitudes (id, tenant_id, persona_id, banco_codigo, tipo_cuenta, estado, solicitado_por_id, updated_at) VALUES ($1, $2, $3, 'BCI', 'Cuenta Corriente', $4, $5, now())`,
          [randomUUID(), randomUUID(), randomUUID(), estado, randomUUID()],
        );
      await solicitud("pendiente");
      await solicitud("aprobada");
      await pg.query(await sql(MIGRACION));
      const tras = (
        await pg.query<{ v: string }>(
          "SELECT banco_codigo || '|' || tipo_cuenta AS v FROM core.personas_pago ORDER BY v",
        )
      ).rows.map((r) => r.v);
      expect(tras).toEqual(vigentes.map(([, , v]) => v).sort());
      const sol = (
        await pg.query<{ v: string }>(
          "SELECT estado || ':' || banco_codigo || '|' || tipo_cuenta AS v FROM core.personas_pago_solicitudes ORDER BY v",
        )
      ).rows.map((r) => r.v);
      expect(sol).toEqual(["aprobada:BCI|Cuenta Corriente", "pendiente:016|corriente"]);
    } finally {
      await pg.end();
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
      await admin.end();
    }
  }, 180_000);
});
