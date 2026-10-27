// Test de aislamiento por tenant (ADR-002). Corre solo si existe DATABASE_URL_TEST
// (rama dev de Neon o Postgres local, con rol propietario). Verifica que:
//   1. forTenant(A) ve solo A y forTenant(B) ve solo B;
//   2. el rol de aplicación sin tenant fijado ve cero filas;
//   3. forTenant(A) no puede escribir filas de B.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("aislamiento por tenant con RLS", () => {
  let e: Entorno;
  let idA = "";
  let idB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const a = await e.admin.tenant.create({
      data: { slug: `test-a-${randomUUID().slice(0, 8)}`, nombre: "A", vertical: "seguridad" },
    });
    const b = await e.admin.tenant.create({
      data: { slug: `test-b-${randomUUID().slice(0, 8)}`, nombre: "B", vertical: "aseo" },
    });
    idA = a.id;
    idB = b.id;
    const rellenoHash = { hashAnterior: "0".repeat(64), hash: "a".repeat(64), hashCanon: "{}" };
    await e.admin.auditEvent.createMany({
      data: [
        { tenantId: idA, actorType: "system", capability: "test.a.1", seq: 1, ...rellenoHash },
        { tenantId: idA, actorType: "system", capability: "test.a.2", seq: 2, ...rellenoHash },
        { tenantId: idB, actorType: "system", capability: "test.b.1", seq: 1, ...rellenoHash },
      ],
    });
  });

  afterAll(async () => {
    if (!e) return;
    await e.admin.auditEvent.deleteMany({ where: { tenantId: { in: [idA, idB] } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [idA, idB] } } });
    await e.cerrar();
  });

  it("cada tenant ve solo sus filas", async () => {
    const deA = await e.forTenant(idA).auditEvent.findMany({ orderBy: { capability: "asc" } });
    const deB = await e.forTenant(idB).auditEvent.findMany();
    expect(deA.map((x) => x.capability)).toEqual(["test.a.1", "test.a.2"]);
    expect(deB.map((x) => x.capability)).toEqual(["test.b.1"]);
  });

  it("el rol de aplicación sin tenant fijado no ve nada", async () => {
    expect(await e.appSinTenant.auditEvent.findMany()).toHaveLength(0);
  });

  it("un tenant no puede escribir filas de otro", async () => {
    await expect(
      e.forTenant(idA).auditEvent.create({
        data: {
          tenantId: idB,
          actorType: "system",
          capability: "test.fuga",
          seq: 99,
          hashAnterior: "0".repeat(64),
          hash: "a".repeat(64),
          hashCanon: "{}",
        },
      }),
    ).rejects.toThrow();
    expect(await e.admin.auditEvent.count({ where: { tenantId: idB } })).toBe(1);
  });

  it("rechaza tenantId que no sea UUID", () => {
    expect(() => e.forTenant("gard")).toThrow(/UUID/);
  });
});
