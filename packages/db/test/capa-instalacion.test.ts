import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("07b: capa instalación", () => {
  let e: Entorno;
  let a: string;
  let b: string;
  let instalacion: string;
  beforeAll(async () => {
    e = await prepararEntorno();
    const crear = async () => {
      const slug = `capa-${randomUUID()}`;
      return (await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } })).id;
    };
    a = await crear();
    b = await crear();
    const cuenta = await e.forTenant(a).cuenta.create({ data: { tenantId: a, nombre: "Ejemplo" } });
    instalacion = (await e.forTenant(a).instalacion.create({
      data: { tenantId: a, cuentaId: cuenta.id, nombre: "Ejemplo" },
    })).id;
  });
  afterAll(async () => { await e?.cerrar(); });
  const datos = () => ({
    tenantId: a, nivel: "instalacion", instalacionId: instalacion,
    sueldoBase: 600000, colacion: 0, movilizacion: 0, gratificacion: "ninguna",
    vigenteDesde: new Date("2026-01-01"),
  });
  it("admite la capa completa y la aísla de otro tenant", async () => {
    const fila = await e.forTenant(a).estructuraSueldo.create({ data: datos() });
    expect(await e.forTenant(b).estructuraSueldo.findFirst({ where: { id: fila.id } })).toBeNull();
  });
  it("rechaza conceptos incompletos, referencias múltiples y referencias cruzadas", async () => {
    await expect(e.forTenant(a).estructuraSueldo.create({
      data: { ...datos(), colacion: null },
    })).rejects.toThrow();
    await expect(e.forTenant(a).estructuraSueldo.create({
      data: { ...datos(), personaId: randomUUID() },
    })).rejects.toThrow();
    await expect(e.forTenant(b).estructuraSueldo.create({
      data: { ...datos(), tenantId: b },
    })).rejects.toThrow();
  });
  it("mantiene RLS forzada y el rol de aplicación sin bypass", async () => {
    const filas = await e.admin.$queryRaw<{ rls: boolean; fuerza: boolean; bypass: boolean }[]>`
      SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS fuerza, r.rolbypassrls AS bypass
      FROM pg_class c CROSS JOIN pg_roles r
      WHERE c.oid = 'core.estructuras_sueldo'::regclass AND r.rolname = 'opai_app'`;
    expect(filas).toEqual([{ rls: true, fuerza: true, bypass: false }]);
  });
});
