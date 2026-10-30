// Brief 02 (revisión): la política de cada tabla con tenant_id es exactamente la del estándar, ninguna
// tabla deja ver filas de otro tenant y las referencias entre tablas no cruzan tenants.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

type Politica = {
  tabla: string;
  cmd: string;
  roles: string[] | string;
  permissive: string;
  qual: string | null;
  with_check: string | null;
};

describe.skipIf(!urlPropietario)("políticas y referencias del núcleo", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let cuentaB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevo(`pol-a-${sufijo}`)).id;
    idB = (await nuevo(`pol-b-${sufijo}`)).id;
    cuentaB = (await e.admin.cuenta.create({ data: { tenantId: idB, nombre: "B" } })).id;
    await e.admin.evento.create({
      data: { tenantId: idB, tipo: "core.prueba", payload: {}, actorTipo: "system" },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada tabla tiene una sola política: permisiva, FOR ALL, TO opai_app, con el filtro estándar", async () => {
    const filas = await e.admin.$queryRaw<Politica[]>`
      SELECT p.tablename AS tabla, p.cmd, p.roles::text[] AS roles, p.permissive, p.qual, p.with_check
      FROM pg_policies p
      WHERE p.schemaname NOT IN ('pg_catalog', 'information_schema')
        AND EXISTS (SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = p.schemaname AND col.table_name = p.tablename
            AND col.column_name = 'tenant_id')
        AND p.policyname = 'tenant_isolation'`;
    expect(filas.length).toBeGreaterThanOrEqual(38);
    const filtro =
      /^\(tenant_id = \(NULLIF\(current_setting\('app\.tenant_id'::text, true\), ''::text\)\)::uuid\)$/;
    const malas = filas
      .filter(
        (f) =>
          f.cmd !== "ALL" ||
          f.permissive !== "PERMISSIVE" ||
          String(f.roles) !== "opai_app" ||
          !filtro.test(f.qual ?? "") ||
          f.with_check !== f.qual,
      )
      .map((f) => f.tabla);
    expect(malas).toEqual([]);
    // `plataforma_lectura` (core.dias_calendario, CAR-79): política extra permitida, de solo lectura
    // de las filas de plataforma (tenant_id nulo); opai_app no puede escribirlas (ver calendario-db).
    const extra = await e.admin.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM pg_policies
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND policyname <> 'tenant_isolation' AND policyname <> 'user_self'
        AND NOT (tablename = 'dias_calendario' AND policyname = 'plataforma_lectura')`;
    expect(Number(extra[0]?.n)).toBe(0);
  });

  // Solo `core`; la prueba de fugas de todos los schemas, con filas en A y B y escrituras cruzadas,
  // es `rls-dos-empresas.test.ts` (CAR-48).
  it("con el tenant A fijado, ninguna tabla devuelve filas de otro tenant", async () => {
    const tablas = await e.admin.$queryRaw<{ tabla: string }[]>`
      SELECT table_name AS tabla FROM information_schema.columns
      WHERE table_schema = 'core' AND column_name = 'tenant_id'`;
    const { enTransaccion } = await import("../src/transaccion");
    const fugas: string[] = [];
    for (const { tabla } of tablas) {
      const r = await enTransaccion(idA, (tx) =>
        tx.$queryRawUnsafe<{ n: bigint }[]>(
          `SELECT count(*) AS n FROM "core"."${tabla}" WHERE tenant_id <> $1::uuid`,
          idA,
        ),
      );
      if (Number(r[0]?.n) > 0) fugas.push(tabla);
    }
    expect(fugas).toEqual([]);
    // La prueba no es vacía: hay filas de B que el propietario sí ve.
    expect(await e.admin.cuenta.count({ where: { tenantId: idB } })).toBeGreaterThan(0);
  });

  it("una fila de A no puede apuntar a una fila de B, ni siquiera saltándose RLS", async () => {
    const datos = { tenantId: idA, cuentaId: cuentaB, nombre: "Cruzada" };
    await expect(e.forTenant(idA).instalacion.create({ data: datos })).rejects.toThrow();
    await expect(e.admin.instalacion.create({ data: datos })).rejects.toThrow(
      /Foreign key|otra empresa/,
    );
    const propia = await e.admin.cuenta.create({ data: { tenantId: idA, nombre: "A" } });
    const ok = await e.forTenant(idA).instalacion.create({
      data: { ...datos, cuentaId: propia.id },
    });
    expect(ok.cuentaId).toBe(propia.id);
    await expect(
      e.admin.instalacion.update({ where: { id: ok.id }, data: { cuentaId: cuentaB } }),
    ).rejects.toThrow(/Foreign key|otra empresa/);
  });
});
