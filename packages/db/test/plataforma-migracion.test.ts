// CAR-36 (revisión del PR #109): la migración que saca las aprobaciones `platform.*` de las empresas
// borra sus eventos y notificaciones en la empresa de la key y desliga sus envíos, aunque ya existan
// las FK RESTRICT de `envios`/`notificaciones` → `eventos` (#113): se apliquen antes o después.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { urlPropietario } from "./entorno";

const MIGRACION = "20261028230000_plataforma_aprobaciones_auditoria";
const carpeta = new URL("../prisma/migrations/", import.meta.url);
const sql = (nombre: string) => readFile(new URL(`${nombre}/migration.sql`, carpeta), "utf8");

const T = "00000000-0000-7000-8000-00000000000a";
const U = "00000000-0000-7000-8000-0000000000b1";
const K = "00000000-0000-7000-8000-0000000000c1";
const id = (n: string) => `00000000-0000-7000-8000-0000000000${n}`;

const SEMILLA = `
INSERT INTO core.tenants (id, slug, nombre, vertical, updated_at) VALUES ('${T}', 'x', 'X', 'seguridad', now());
INSERT INTO core.users (id, name, email, updated_at) VALUES ('${U}', 'u', 'u@x.cl', now());
INSERT INTO core.api_keys (id, tenant_id, user_id, nombre, prefijo, hash, updated_at)
  VALUES ('${K}', '${T}', '${U}', 'K', 'p', 'h', now());
INSERT INTO core.aprobaciones (id, tenant_id, api_key_id, agente_interno_id, via_user_id, capability,
  input, resumen, vence_en, updated_at) VALUES
  ('${id("d1")}', '${T}', NULL, 'ag-1', '${U}', 'platform.admins.invite', '{}', 'Invitar a y@y.cl', now() + interval '1 day', now()),
  ('${id("d2")}', '${T}', '${K}', NULL, '${U}', 'core.algo', '{}', 'propia', now() + interval '1 day', now());
INSERT INTO core.eventos (id, tenant_id, tipo, entidad_tipo, entidad_id, payload, actor_tipo, updated_at) VALUES
  ('${id("e1")}', '${T}', 'core.aprobacion.pendiente', 'aprobacion', '${id("d1")}', '{"resumen":"Invitar a y@y.cl"}', 'agent', now()),
  ('${id("e2")}', '${T}', 'core.aprobacion.resuelta', 'aprobacion', '${id("d1")}', '{}', 'user', now()),
  ('${id("e3")}', '${T}', 'core.aprobacion.pendiente', 'aprobacion', '${id("d2")}', '{}', 'agent', now());
INSERT INTO core.eventos_entregas (id, tenant_id, evento_id, consumidor, estado, updated_at) VALUES
  ('${id("f1")}', '${T}', '${id("e1")}', 'avisos', 'ok', now()),
  ('${id("f3")}', '${T}', '${id("e3")}', 'avisos', 'ok', now());
INSERT INTO core.notificaciones (id, tenant_id, usuario_id, evento_id, titulo, updated_at) VALUES
  ('${id("a1")}', '${T}', '${U}', '${id("e1")}', 'Invitar a y@y.cl', now()),
  ('${id("a3")}', '${T}', '${U}', '${id("e3")}', 'propia', now());
INSERT INTO core.envios (id, tenant_id, evento_id, canal, destinatario, estado) VALUES
  ('${id("b1")}', '${T}', '${id("e1")}', 'correo', 'admin@x.cl', 'enviado'),
  ('${id("b3")}', '${T}', '${id("e3")}', 'correo', 'admin@x.cl', 'enviado');
-- Las FK del #113 (CAR-45/46), creadas antes: RESTRICT rige ya; se validan después.
ALTER TABLE core.envios ADD CONSTRAINT car113_envios_evento FOREIGN KEY (evento_id)
  REFERENCES core.eventos(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE core.notificaciones ADD CONSTRAINT car113_notificaciones_evento FOREIGN KEY (evento_id)
  REFERENCES core.eventos(id) ON DELETE RESTRICT NOT VALID;`;

describe.skipIf(!urlPropietario)("migración de aprobaciones de plataforma (CAR-36)", () => {
  it("borra los restos en la empresa de la key sin chocar con las FK RESTRICT de #113", async () => {
    const admin = new Client({ connectionString: urlPropietario });
    await admin.connect();
    const nombre = `opai_car36_mig_${randomUUID().replaceAll("-", "")}`;
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
      await pg.query(SEMILLA);
      await pg.query(await sql(MIGRACION));

      const ids = async (tabla: string) =>
        (await pg.query<{ id: string }>(`SELECT id FROM core.${tabla} ORDER BY id`)).rows.map((r) =>
          r.id.slice(-2),
        );
      // Lo de la aprobación propia de la empresa queda; lo de la de plataforma, no.
      expect(await ids("aprobaciones")).toEqual(["d2"]);
      expect(await ids("eventos")).toEqual(["e3"]);
      expect(await ids("eventos_entregas")).toEqual(["f3"]);
      expect(await ids("notificaciones")).toEqual(["a3"]);
      // El envío se conserva como registro, desligado del evento borrado.
      const envios = await pg.query<{ id: string; evento_id: string | null }>(
        "SELECT id, evento_id FROM core.envios ORDER BY id",
      );
      expect(envios.rows.map((r) => [r.id.slice(-2), r.evento_id?.slice(-2) ?? null])).toEqual([
        ["b1", null],
        ["b3", "e3"],
      ]);
      const cola = await pg.query(
        "SELECT agente, agente_interno_id FROM core.aprobaciones_plataforma",
      );
      expect(cola.rows).toEqual([{ agente: "Agente interno", agente_interno_id: "ag-1" }]);
      // Las FK del #113 validan sobre lo que quedó (orden inverso: este PR primero).
      await pg.query("ALTER TABLE core.envios VALIDATE CONSTRAINT car113_envios_evento");
      await pg.query(
        "ALTER TABLE core.notificaciones VALIDATE CONSTRAINT car113_notificaciones_evento",
      );
      // FORCE RLS vuelve en todas las tablas que la migración tocó.
      const forzadas = await pg.query<{ relname: string }>(
        `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'core' AND relforcerowsecurity AND relname = ANY($1) ORDER BY relname`,
        [
          [
            "api_keys",
            "aprobaciones",
            "audit_events",
            "envios",
            "eventos",
            "eventos_entregas",
            "notificaciones",
          ],
        ],
      );
      expect(forzadas.rows).toHaveLength(7);
    } finally {
      await pg.end();
      await admin.query(`DROP DATABASE "${nombre}" WITH (FORCE)`);
      await admin.end();
    }
  }, 180_000);
});
