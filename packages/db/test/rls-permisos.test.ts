// Brief 07c · B2: aislamiento por tenant de los roles del tenant y las excepciones por usuario, y
// que la membresía solo apunte a un rol de su empresa (trigger de mismo tenant). El estándar de RLS
// y política ya lo verifican rls-nucleo*.test.ts sobre todas las tablas con tenant_id.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("RLS de roles y excepciones (Brief 07c B2)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let rolB = "";
  let membresiaA = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevoTenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevoTenant(`perm-a-${sufijo}`)).id;
    idB = (await nuevoTenant(`perm-b-${sufijo}`)).id;
    const userA = await e.admin.user.create({
      data: { id: randomUUID(), name: "A", email: `a-${sufijo}@prueba.cl` },
    });
    const userB = await e.admin.user.create({
      data: { id: randomUUID(), name: "B", email: `b-${sufijo}@prueba.cl` },
    });
    membresiaA = (
      await e.admin.membership.create({
        data: { tenantId: idA, userId: userA.id, rol: "viewer", portales: ["erp"] },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId: idB, userId: userB.id, rol: "viewer", portales: ["erp"] },
    });
    rolB = (
      await e.admin.rol.create({
        data: { tenantId: idB, nombre: "Central de monitoreo", permisos: ["core:instalaciones.read"] },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada tenant ve solo sus roles y no crea uno en otro tenant", async () => {
    const a = e.forTenant(idA);
    await a.rol.create({ data: { tenantId: idA, nombre: "Inspector DT", permisos: [] } });
    const roles = await a.rol.findMany();
    expect(roles).toHaveLength(1);
    expect(roles.every((r) => r.tenantId === idA)).toBe(true);
    await expect(
      a.rol.create({ data: { tenantId: idB, nombre: "Colada", permisos: [] } }),
    ).rejects.toThrow();
  });

  it("una membresía no puede apuntar a un rol de otra empresa", async () => {
    await expect(
      e.forTenant(idA).membership.update({
        where: { id: membresiaA },
        data: { roleId: rolB },
      }),
    ).rejects.toThrow();
    await expect(
      e.admin.membership.update({ where: { id: membresiaA }, data: { roleId: rolB } }),
    ).rejects.toThrow(/Foreign key|otra empresa/);
  });

  it("una excepción solo cuelga de una membresía de su empresa", async () => {
    const a = e.forTenant(idA);
    const ok = await a.permisoExcepcion.create({
      data: { tenantId: idA, membershipId: membresiaA, permiso: "core:cuentas.read", conceder: true },
    });
    expect(ok.conceder).toBe(true);
    const membresiaB = await e.admin.membership.findFirstOrThrow({ where: { tenantId: idB } });
    await expect(
      e.admin.permisoExcepcion.create({
        data: {
          tenantId: idA,
          membershipId: membresiaB.id,
          permiso: "core:cuentas.read",
          conceder: true,
        },
      }),
    ).rejects.toThrow(/Foreign key|otra empresa/);
  });
});
