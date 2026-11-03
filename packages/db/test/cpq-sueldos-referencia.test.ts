// CAR-162 · CPQ v4 — sueldo de referencia por cargo: RLS, mismo tenant y unicidad por vigencia.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("CPQ sueldos de referencia (CAR-162)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let usuario = "";
  let cargoA = "";
  let cargoB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const tenant = (slug: string) => e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await tenant(`ref-a-${sufijo}`)).id;
    idB = (await tenant(`ref-b-${sufijo}`)).id;
    usuario = (
      await e.admin.user.create({ data: { email: `ref-${sufijo}@prueba.cl`, name: "Ana", emailVerified: true } })
    ).id;
    cargoA = (await e.admin.cargo.create({ data: { tenantId: idA, nombre: "Guardia" } })).id;
    cargoB = (await e.admin.cargo.create({ data: { tenantId: idB, nombre: "Guardia" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const fila = (tenantId: string, cargoId: string, desde = "2026-11-01") => ({
    tenantId,
    cargoId,
    sueldoBaseClp: 600_000,
    vigenteDesde: new Date(`${desde}T00:00:00Z`),
    creadoPorId: usuario,
  });

  it("cada empresa ve solo sus referencias y no escribe en otra", async () => {
    await e.admin.cpqSueldoReferencia.create({ data: fila(idA, cargoA) });
    expect(await e.forTenant(idB).cpqSueldoReferencia.count()).toBe(0);
    expect(await e.forTenant(idA).cpqSueldoReferencia.count()).toBe(1);
    await expect(e.forTenant(idB).cpqSueldoReferencia.create({ data: fila(idA, cargoA, "2026-11-02") })).rejects.toThrow();
    expect((await e.forTenant(idB).cpqSueldoReferencia.deleteMany({})).count).toBe(0);
  });

  it("no acepta un cargo de otra empresa (mismo_tenant)", async () => {
    await expect(e.admin.cpqSueldoReferencia.create({ data: fila(idA, cargoB, "2026-11-03") })).rejects.toThrow();
  });

  it("una sola referencia por cargo y fecha de vigencia, y no admite montos negativos", async () => {
    await expect(e.admin.cpqSueldoReferencia.create({ data: fila(idA, cargoA) })).rejects.toThrow();
    await expect(
      e.admin.cpqSueldoReferencia.create({ data: { ...fila(idA, cargoA, "2026-12-01"), sueldoBaseClp: -1 } }),
    ).rejects.toThrow();
  });
});
