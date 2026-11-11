// CAR-251, migración 20261119100000: las FK compuestas impiden, incluso al rol propietario (sin
// RLS), sumar a un grupo un usuario que no es miembro de la empresa o colgar un miembro de un grupo
// de otra empresa. El nombre es único entre los grupos vigentes y archivar lo libera.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("grupos de usuarios: integridad (CAR-251)", () => {
  let e: Entorno;
  const t = { a: "", b: "" };
  const u = { a: "", b: "" };
  let grupoA = "";
  let grupoB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const sufijo = randomUUID().slice(0, 8);
    for (const lado of ["a", "b"] as const) {
      const slug = `grp-${lado}-${sufijo}`;
      t[lado] = (
        await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })
      ).id;
      u[lado] = (
        await e.admin.user.create({ data: { name: lado, email: `${slug}@prueba.test` } })
      ).id;
      await e.admin.membership.create({
        data: { tenantId: t[lado], userId: u[lado], rol: "admin", portales: ["erp"] },
      });
    }
    grupoA = (
      await e.admin.grupoUsuarios.create({ data: { tenantId: t.a, nombre: "Aprobadores" } })
    ).id;
    grupoB = (
      await e.admin.grupoUsuarios.create({ data: { tenantId: t.b, nombre: "Aprobadores" } })
    ).id;
  });

  afterAll(async () => {
    if (!e) return;
    const w = { where: { tenantId: { in: [t.a, t.b] } } };
    await e.admin.grupoUsuarioMiembro.deleteMany(w);
    await e.admin.grupoUsuarios.deleteMany(w);
    await e.admin.membership.deleteMany(w);
    await e.admin.user.deleteMany({ where: { id: { in: [u.a, u.b] } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [t.a, t.b] } } });
    await e.cerrar();
  });

  const sumar = (tenantId: string, grupoId: string, userId: string) =>
    e.admin.grupoUsuarioMiembro.create({ data: { tenantId, grupoId, userId } });

  it("acepta a un miembro de la misma empresa, una sola vez", async () => {
    await expect(sumar(t.a, grupoA, u.a)).resolves.toMatchObject({ userId: u.a });
    await expect(sumar(t.a, grupoA, u.a)).rejects.toThrow();
  });

  it("rechaza a un usuario de otra empresa aunque el rol salte la RLS", async () => {
    await expect(sumar(t.a, grupoA, u.b)).rejects.toThrow(/foreign key|Foreign key/i);
  });

  it("rechaza colgar un miembro de un grupo de otra empresa", async () => {
    await expect(sumar(t.a, grupoB, u.a)).rejects.toThrow(/foreign key|Foreign key/i);
  });

  it("nombre único por empresa entre vigentes; archivar lo libera", async () => {
    await expect(
      e.admin.grupoUsuarios.create({ data: { tenantId: t.a, nombre: "aprobadores" } }),
    ).rejects.toThrow();
    await e.admin.grupoUsuarios.update({
      where: { id: grupoA },
      data: { archivadoEn: new Date() },
    });
    await expect(
      e.admin.grupoUsuarios.create({ data: { tenantId: t.a, nombre: "Aprobadores" } }),
    ).resolves.toMatchObject({ nombre: "Aprobadores" });
  });

  it("como opai_app, la empresa A no ve los grupos de B", async () => {
    const vistos = await e.forTenant(t.a).grupoUsuarios.findMany({ where: { id: grupoB } });
    expect(vistos).toEqual([]);
  });
});
