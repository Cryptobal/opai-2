// Brief 02: toda tabla de `core` con tenant_id tiene RLS y política tenant_isolation; aislamiento real
// en maestros y documentos; `enTransaccion` fija el tenant y revierte en error.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("RLS del núcleo (Brief 02)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevo(`nucleo-a-${sufijo}`)).id;
    idB = (await nuevo(`nucleo-b-${sufijo}`)).id;
    for (const tenantId of [idA, idB]) {
      const cuenta = await e.admin.cuenta.create({
        data: { tenantId, nombre: `Cuenta ${tenantId.slice(0, 4)}`, rut: "76543210-3" },
      });
      await e.admin.instalacion.create({
        data: { tenantId, cuentaId: cuenta.id, nombre: "Planta Quilicura" },
      });
      await e.admin.persona.create({
        data: { tenantId, nombres: "María", apellidos: "Soto", rut: "16234567-8" },
      });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  // Contrato multi-tenant (AGENTS.md): en cualquier schema de la aplicación, toda tabla con
  // tenant_id tiene RLS activa y exactamente una política tenant_isolation. Cubre los schemas de
  // módulos futuros sin tocar este test.
  it("toda tabla con tenant_id, en cualquier schema, tiene RLS y la política tenant_isolation", async () => {
    const filas = await e.admin.$queryRaw<
      { esquema: string; tabla: string; rls: boolean; politicas: bigint }[]
    >`
      SELECT n.nspname AS esquema, c.relname AS tabla, c.relrowsecurity AS rls,
        (SELECT count(*) FROM pg_policies p
          WHERE p.schemaname = n.nspname AND p.tablename = c.relname
            AND p.policyname = 'tenant_isolation') AS politicas
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND n.nspname !~ '^pg_'
        AND EXISTS (SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = n.nspname AND col.table_name = c.relname
            AND col.column_name = 'tenant_id')`;
    expect(filas.length).toBeGreaterThanOrEqual(38);
    const sinRls = filas
      .filter((f) => !f.rls || Number(f.politicas) !== 1)
      .map((f) => `${f.esquema}.${f.tabla}`);
    expect(sinRls).toEqual([]);
  });

  it("sin tenant fijado, la aplicación no ve maestros", async () => {
    expect(await e.appSinTenant.cuenta.count()).toBe(0);
    expect(await e.appSinTenant.persona.count()).toBe(0);
  });

  it("cada tenant ve solo sus maestros y no escribe en otro", async () => {
    const a = e.forTenant(idA);
    const cuentas = await a.cuenta.findMany();
    expect(cuentas.every((c) => c.tenantId === idA)).toBe(true);
    expect(await a.instalacion.count()).toBe(1);
    expect(await a.persona.count()).toBe(1);
    await expect(
      a.persona.create({
        data: { tenantId: idB, nombres: "X", apellidos: "Y", rut: "11111111-1" },
      }),
    ).rejects.toThrow();
  });

  it("RUT único por tenant y un solo vínculo vigente por persona", async () => {
    const a = e.forTenant(idA);
    await expect(
      a.persona.create({
        data: { tenantId: idA, nombres: "Otra", apellidos: "Persona", rut: "16234567-8" },
      }),
    ).rejects.toThrow();
    const persona = await a.persona.findFirstOrThrow();
    const cargo = await a.cargo.create({ data: { tenantId: idA, nombre: `Guardia ${sufijo}` } });
    const base = { tenantId: idA, personaId: persona.id, cargoId: cargo.id, tipo: "indefinido" };
    await a.vinculoLaboral.create({ data: { ...base, inicio: new Date("2025-03-03") } });
    await expect(
      a.vinculoLaboral.create({ data: { ...base, inicio: new Date("2026-01-01") } }),
    ).rejects.toThrow();
  });

  it("la estructura de sueldo exige exactamente una referencia según su nivel", async () => {
    const a = e.forTenant(idA);
    const cargo = await a.cargo.create({ data: { tenantId: idA, nombre: `Supervisor ${sufijo}` } });
    const comun = { tenantId: idA, sueldoBase: 850_000, vigenteDesde: new Date("2026-01-01") };
    const completo = {
      ...comun,
      colacion: 45_000,
      movilizacion: 60_000,
      gratificacion: "legal_25",
    };
    await expect(
      a.estructuraSueldo.create({ data: { ...completo, nivel: "puesto", cargoId: cargo.id } }),
    ).rejects.toThrow();
    // El nivel cargo define todos los conceptos (CHECK); puesto y persona heredan lo que omiten.
    await expect(
      a.estructuraSueldo.create({ data: { ...comun, nivel: "cargo", cargoId: cargo.id } }),
    ).rejects.toThrow();
    const ok = await a.estructuraSueldo.create({
      data: { ...completo, nivel: "cargo", cargoId: cargo.id },
    });
    expect(ok.nivel).toBe("cargo");
  });

  it("enTransaccion fija el tenant y revierte todo si algo falla", async () => {
    const { enTransaccion } = await import("../src/transaccion");
    const nombre = `Tx ${sufijo}`;
    await expect(
      enTransaccion(idA, async (tx) => {
        await tx.cuenta.create({ data: { tenantId: idA, nombre } });
        await tx.evento.create({
          data: { tenantId: idA, tipo: "core.cuenta.creada", payload: {}, actorTipo: "system" },
        });
        throw new Error("falla a propósito");
      }),
    ).rejects.toThrow("falla a propósito");
    expect(await e.forTenant(idA).cuenta.count({ where: { nombre } })).toBe(0);
    const creada = await enTransaccion(idA, (tx) =>
      tx.cuenta.create({ data: { tenantId: idA, nombre } }),
    );
    expect(creada.tenantId).toBe(idA);
    await expect(
      enTransaccion(idA, (tx) => tx.cuenta.create({ data: { tenantId: idB, nombre } })),
    ).rejects.toThrow();
  });
});
