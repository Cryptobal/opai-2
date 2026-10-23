// Aislamiento de membresías, invitaciones, API keys y telemetría (Brief 01): `user_self`
// permite a un usuario ver solo sus membresías; `tenant_isolation` separa todo lo demás.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("RLS de identidad y pertenencia", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let u1 = "";
  let u2 = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevo(`rls-a-${sufijo}`)).id;
    idB = (await nuevo(`rls-b-${sufijo}`)).id;
    const usuario = (n: string) =>
      e.admin.user.create({ data: { name: n, email: `${n}-${sufijo}@test.opai.cl` } });
    u1 = (await usuario("u1")).id;
    u2 = (await usuario("u2")).id;
    await e.admin.membership.createMany({
      data: [
        { tenantId: idA, userId: u1, rol: "owner", portales: ["erp"] },
        { tenantId: idB, userId: u1, rol: "viewer", portales: ["erp"] },
        { tenantId: idA, userId: u2, rol: "admin", portales: ["erp"] },
      ],
    });
    await e.admin.invitation.createMany({
      data: [idA, idB].map((tenantId) => ({
        tenantId,
        email: `inv-${sufijo}@test.opai.cl`,
        rol: "viewer",
        portales: ["erp"],
        tokenHash: `hash-${tenantId}`,
        invitedByUserId: u1,
        expiresAt: new Date(Date.now() + 3_600_000),
      })),
    });
  });

  afterAll(async () => {
    if (!e) return;
    const tenants = { tenantId: { in: [idA, idB] } };
    await e.admin.invitation.deleteMany({ where: tenants });
    await e.admin.membership.deleteMany({ where: tenants });
    await e.admin.user.deleteMany({ where: { id: { in: [u1, u2] } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [idA, idB] } } });
    await e.cerrar();
  });

  it("forUser ve solo las membresías propias, en todos sus tenants", async () => {
    const de1 = await e.forUser(u1).membership.findMany();
    const de2 = await e.forUser(u2).membership.findMany();
    expect(de1.map((m) => m.tenantId).sort()).toEqual([idA, idB].sort());
    expect(de2.map((m) => m.userId)).toEqual([u2]);
  });

  it("forUser no puede escribir membresías (user_self es solo lectura)", async () => {
    await expect(
      e.forUser(u2).membership.create({
        data: { tenantId: idB, userId: u2, rol: "owner", portales: ["erp"] },
      }),
    ).rejects.toThrow();
  });

  it("forTenant(A) no ve membresías ni invitaciones de B", async () => {
    const m = await e.forTenant(idA).membership.findMany();
    const i = await e.forTenant(idA).invitation.findMany();
    expect(new Set(m.map((x) => x.tenantId))).toEqual(new Set([idA]));
    expect(m).toHaveLength(2);
    expect(i.map((x) => x.tenantId)).toEqual([idA]);
  });

  it("sin tenant ni usuario fijados no se ve nada", async () => {
    expect(await e.appSinTenant.membership.findMany()).toHaveLength(0);
    expect(await e.appSinTenant.invitation.findMany()).toHaveLength(0);
    expect(await e.appSinTenant.apiKey.findMany()).toHaveLength(0);
    expect(await e.appSinTenant.usageEvent.findMany()).toHaveLength(0);
  });
});
