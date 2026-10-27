import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("despliegue de auditoría en dos fases", () => {
  it("verifica datos históricos, convivencia nullable, cierre y reejecución idempotente", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_aud_mig_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE DATABASE "${nombre}"`);
    const url = new URL(urlPropietario!);
    url.pathname = `/${nombre}`;
    const pg = new Client({ connectionString: url.toString() });
    const previa = process.env["DATABASE_URL"];
    const { cerrarClientes } = await import("../src/client");
    try {
      await pg.connect();
      await pg.query(`CREATE SCHEMA core;
        CREATE SCHEMA extensions;
        CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
        CREATE TABLE core.tenants(id uuid PRIMARY KEY);
        CREATE TABLE core.audit_events (
          id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES core.tenants(id),
          actor_type text NOT NULL, actor_id text, via_user_id text, capability text NOT NULL,
          entity_type text, entity_id text, payload jsonb, created_at timestamptz(6) NOT NULL
        );`);
      const tenantId = randomUUID();
      await pg.query("INSERT INTO core.tenants VALUES ($1)", [tenantId]);
      const insertarVieja = async () =>
        pg.query(
          `INSERT INTO core.audit_events
        (id, tenant_id, actor_type, capability, entity_type, payload, created_at)
        VALUES ($1, $2, 'system', 'core.prueba|ent', 'tipo', $3, '2026-10-26T12:34:56.123456Z')`,
          [randomUUID(), tenantId, JSON.stringify({ z: [1, null, "á"], a: { b: true } })],
        );
      await insertarVieja();
      const fase1 = await readFile(
        new URL(
          "../prisma/migrations/20261028090000_auditoria_encadenada/migration.sql",
          import.meta.url,
        ),
        "utf8",
      );
      const fase2 = await readFile(
        new URL(
          "../prisma/migrations/20261028100000_auditoria_obligatoria/migration.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await pg.query(fase1);
      await cerrarClientes();
      process.env["DATABASE_URL"] = url.toString();
      const { verificarAuditoria } = await import("../src/auditoria");
      expect(await verificarAuditoria(tenantId)).toEqual({
        ok: true,
        ultimoSeq: 1,
        primeraRota: null,
      });
      // El código viejo aún escribe después de la expansión; no viola NOT NULL.
      await insertarVieja();
      expect(await verificarAuditoria(tenantId)).toMatchObject({ ok: false });
      const { agregarAAuditoria } = await import("../src/auditoria");
      const { enTransaccion } = await import("../src/transaccion");
      const nuevo = await enTransaccion(tenantId, (tx) =>
        agregarAAuditoria(tx, tenantId, {
          actorTipo: "system",
          actorId: null,
          viaUserId: null,
          capability: "core.nueva",
          entityType: null,
          entityId: null,
          payload: { nuevo: true },
        }),
      );
      expect(nuevo.seq).toBe(2);
      await pg.query(fase2);
      expect(await verificarAuditoria(tenantId)).toEqual({
        ok: true,
        ultimoSeq: 3,
        primeraRota: null,
      });
      const antes = (await pg.query("SELECT * FROM core.audit_events ORDER BY seq")).rows;
      await pg.query(fase1);
      await pg.query(fase2);
      expect((await pg.query("SELECT * FROM core.audit_events ORDER BY seq")).rows).toEqual(antes);
      await expect(insertarVieja()).rejects.toThrow();
      await pg.query("UPDATE core.audit_events SET actor_id = '' WHERE seq = 1");
      expect(await verificarAuditoria(tenantId)).toMatchObject({ ok: false, primeraRota: 1 });
      await pg.query("UPDATE core.audit_events SET actor_id = NULL WHERE seq = 1");
      await pg.query(
        "UPDATE core.audit_events SET capability = 'core.prueba', entity_type = 'ent|tipo' WHERE seq = 1",
      );
      expect(await verificarAuditoria(tenantId)).toMatchObject({ ok: false, primeraRota: 1 });
      await pg.query(
        "UPDATE core.audit_events SET capability = 'core.prueba|ent', entity_type = 'tipo' WHERE seq = 1",
      );
      await pg.query("UPDATE core.audit_events SET payload = '{}' WHERE seq = 1");
      expect(await verificarAuditoria(tenantId)).toMatchObject({ ok: false, primeraRota: 1 });
    } finally {
      await cerrarClientes();
      if (previa === undefined) delete process.env["DATABASE_URL"];
      else process.env["DATABASE_URL"] = previa;
      await pg.end();
      await admin.query(`DROP DATABASE "${nombre}"`);
      await admin.end();
    }
  });
});
