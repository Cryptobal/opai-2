// CAR-359, migración 20261222100000: las FK compuestas impiden, incluso al rol propietario (sin
// RLS), asignar a un miembro o a un grupo un rol de otra empresa, y la RLS aísla las asignaciones.
// Borrar el rol, el grupo o la membresía arrastra sus asignaciones.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("roles adicionales y de grupo: integridad (CAR-359)", () => {
  let e: Entorno;
  const t = { a: "", b: "" };
  const u = { a: "", b: "" };
  const rol = { a: "", b: "" };
  const grupo = { a: "", b: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    const sufijo = randomUUID().slice(0, 8);
    for (const lado of ["a", "b"] as const) {
      const slug = `rad-${lado}-${sufijo}`;
      t[lado] = (
        await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })
      ).id;
      u[lado] = (
        await e.admin.user.create({ data: { name: lado, email: `${slug}@prueba.test` } })
      ).id;
      await e.admin.membership.create({
        data: { tenantId: t[lado], userId: u[lado], rol: "viewer", portales: ["erp"] },
      });
      rol[lado] = (
        await e.admin.rol.create({
          data: { tenantId: t[lado], nombre: "Aprueba rendiciones", permisos: ["rendiciones:*"] },
        })
      ).id;
      grupo[lado] = (
        await e.admin.grupoUsuarios.create({ data: { tenantId: t[lado], nombre: "Finanzas" } })
      ).id;
    }
  });

  afterAll(async () => {
    if (!e) return;
    const w = { where: { tenantId: { in: [t.a, t.b] } } };
    await e.admin.rolMiembro.deleteMany(w);
    await e.admin.rolGrupo.deleteMany(w);
    await e.admin.grupoUsuarios.deleteMany(w);
    await e.admin.rol.deleteMany(w);
    await e.admin.membership.deleteMany(w);
    await e.admin.user.deleteMany({ where: { id: { in: [u.a, u.b] } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [t.a, t.b] } } });
    await e.cerrar();
  });

  it("asigna un rol de la misma empresa a un miembro y a un grupo, una sola vez", async () => {
    const data = { tenantId: t.a, userId: u.a, roleId: rol.a };
    await expect(e.admin.rolMiembro.create({ data })).resolves.toMatchObject(data);
    await expect(e.admin.rolMiembro.create({ data })).rejects.toThrow();
    const g = { tenantId: t.a, grupoId: grupo.a, roleId: rol.a };
    await expect(e.admin.rolGrupo.create({ data: g })).resolves.toMatchObject(g);
    await expect(e.admin.rolGrupo.create({ data: g })).rejects.toThrow();
  });

  it("rechaza un rol de otra empresa aunque el rol salte la RLS", async () => {
    await expect(
      e.admin.rolMiembro.create({ data: { tenantId: t.a, userId: u.a, roleId: rol.b } }),
    ).rejects.toThrow(/foreign key/i);
    await expect(
      e.admin.rolGrupo.create({ data: { tenantId: t.a, grupoId: grupo.a, roleId: rol.b } }),
    ).rejects.toThrow(/foreign key/i);
  });

  it("rechaza un miembro o un grupo de otra empresa", async () => {
    await expect(
      e.admin.rolMiembro.create({ data: { tenantId: t.a, userId: u.b, roleId: rol.a } }),
    ).rejects.toThrow(/foreign key/i);
    await expect(
      e.admin.rolGrupo.create({ data: { tenantId: t.a, grupoId: grupo.b, roleId: rol.a } }),
    ).rejects.toThrow(/foreign key/i);
  });

  it("como opai_app, la empresa B no ve ni crea asignaciones de A", async () => {
    expect(await e.forTenant(t.b).rolMiembro.findMany({ where: { tenantId: t.a } })).toEqual([]);
    expect(await e.forTenant(t.b).rolGrupo.findMany({ where: { tenantId: t.a } })).toEqual([]);
    await expect(
      e.forTenant(t.b).rolMiembro.create({ data: { tenantId: t.a, userId: u.a, roleId: rol.a } }),
    ).rejects.toThrow();
  });

  it("borrar el rol arrastra sus asignaciones", async () => {
    const r = await e.admin.rol.create({
      data: { tenantId: t.b, nombre: "Temporal", permisos: [] },
    });
    await e.admin.rolMiembro.create({ data: { tenantId: t.b, userId: u.b, roleId: r.id } });
    await e.admin.rolGrupo.create({ data: { tenantId: t.b, grupoId: grupo.b, roleId: r.id } });
    await e.admin.rol.delete({ where: { id: r.id } });
    expect(await e.admin.rolMiembro.count({ where: { roleId: r.id } })).toBe(0);
    expect(await e.admin.rolGrupo.count({ where: { roleId: r.id } })).toBe(0);
  });
});
