import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20261102220000_cpq_propuesta_tecnica";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

const REVERSION = `
DROP TRIGGER IF EXISTS zzz_verificar_envio_version_cotizacion ON "cpq"."propuesta_envios";
DROP FUNCTION IF EXISTS "cpq"."verificar_envio_version_cotizacion"();
DROP TRIGGER IF EXISTS mismo_tenant_envio_doc_propuesta ON "cpq"."propuesta_envios";
DROP TRIGGER IF EXISTS mismo_tenant_envio_doc_cotizacion ON "cpq"."propuesta_envios";
DROP TRIGGER IF EXISTS mismo_tenant_envio_version ON "cpq"."propuesta_envios";
DROP TRIGGER IF EXISTS mismo_tenant_envio_cotizacion ON "cpq"."propuesta_envios";
DROP TRIGGER IF EXISTS mismo_tenant_envio_propuesta ON "cpq"."propuesta_envios";
DROP TRIGGER IF EXISTS mismo_tenant_propuesta_plantilla ON "cpq"."propuestas_tecnicas";
DROP TRIGGER IF EXISTS mismo_tenant_propuesta_version ON "cpq"."propuestas_tecnicas";
DROP TRIGGER IF EXISTS mismo_tenant_propuesta_cotizacion ON "cpq"."propuestas_tecnicas";
DROP TRIGGER IF EXISTS mismo_tenant ON "cpq"."biblioteca_bloque_revisiones";
DROP TABLE IF EXISTS "cpq"."propuesta_envios";
DROP TABLE IF EXISTS "cpq"."propuestas_tecnicas";
DROP TABLE IF EXISTS "cpq"."biblioteca_bloque_revisiones";
DROP TABLE IF EXISTS "cpq"."biblioteca_bloques";
DROP INDEX IF EXISTS "cpq"."plantillas_documento_una_activa_propuesta";
DROP INDEX IF EXISTS "cpq"."plantillas_documento_una_activa_cotizacion";
CREATE UNIQUE INDEX "plantillas_documento_una_activa_cotizacion" ON "cpq"."plantillas_documento"("tenant_id", "tipo") WHERE "activa" AND "tipo" = 'cotizacion';
ALTER TABLE "cpq"."plantillas_documento" DROP CONSTRAINT IF EXISTS "plantillas_documento_apertura_maxima_check";
ALTER TABLE "cpq"."plantillas_documento" DROP CONSTRAINT IF EXISTS "plantillas_documento_tipo_check";
ALTER TABLE "cpq"."plantillas_documento" ADD CONSTRAINT "plantillas_documento_tipo_check" CHECK ("tipo" IN ('cotizacion'));
ALTER TABLE "cpq"."plantillas_documento" DROP COLUMN IF EXISTS "apertura_maxima", DROP COLUMN IF EXISTS "nombre_visible";
`;

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
      await pg.query(await sql(MIGRACION));
      const tablas = (
        await pg.query<{ tablename: string }>(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'cpq' AND tablename IN ('propuesta_envios','propuestas_tecnicas','biblioteca_bloques') ORDER BY tablename`,
        )
      ).rows.map((r) => r.tablename);
      expect(tablas).toEqual(["biblioteca_bloques", "propuesta_envios", "propuestas_tecnicas"]);
      await pg.query(REVERSION);
      const trasDown = (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'cpq' AND tablename = 'propuesta_envios'`,
        )
      ).rows[0]?.n;
      expect(trasDown).toBe(0);
      await pg.query(await sql(MIGRACION));
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
