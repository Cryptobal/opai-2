// Brief 07c · B3: aislamiento por tenant de la asignación supervisor ↔ instalación, y que una
// asignación solo apunte a una membresía y a una instalación de su propia empresa (trigger de mismo
// tenant). El estándar de RLS y política lo cubren rls-nucleo*.test.ts sobre toda tabla con tenant_id.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("RLS del alcance del supervisor (Brief 07c B3)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let membresiaA = "";
  let membresiaB = "";
  let instA = "";
  let instB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevoTenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevoTenant(`alc-a-${sufijo}`)).id;
    idB = (await nuevoTenant(`alc-b-${sufijo}`)).id;
    const usuario = (n: string) =>
      e.admin.user.create({ data: { id: randomUUID(), name: n, email: `${n}-${sufijo}@prueba.cl` } });
    const uA = await usuario("supA");
    const uB = await usuario("supB");
    membresiaA = (
      await e.admin.membership.create({
        data: { tenantId: idA, userId: uA.id, rol: "supervisor", portales: ["supervisor"] },
      })
    ).id;
    membresiaB = (
      await e.admin.membership.create({
        data: { tenantId: idB, userId: uB.id, rol: "supervisor", portales: ["supervisor"] },
      })
    ).id;
    const cuenta = (tenantId: string) =>
      e.admin.cuenta.create({ data: { tenantId, nombre: `Cuenta ${sufijo}` } });
    const cuentaA = await cuenta(idA);
    const cuentaB = await cuenta(idB);
    instA = (
      await e.admin.instalacion.create({ data: { tenantId: idA, cuentaId: cuentaA.id, nombre: "Planta A" } })
    ).id;
    instB = (
      await e.admin.instalacion.create({ data: { tenantId: idB, cuentaId: cuentaB.id, nombre: "Planta B" } })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada tenant ve y crea solo sus asignaciones", async () => {
    const a = e.forTenant(idA);
    await a.supervisorInstalacion.create({
      data: { tenantId: idA, membershipId: membresiaA, instalacionId: instA },
    });
    const filas = await a.supervisorInstalacion.findMany();
    expect(filas).toHaveLength(1);
    expect(filas.every((f) => f.tenantId === idA)).toBe(true);
    // No deja crear una fila de otro tenant (RLS WITH CHECK).
    await expect(
      a.supervisorInstalacion.create({
        data: { tenantId: idB, membershipId: membresiaB, instalacionId: instB },
      }),
    ).rejects.toThrow();
  });

  it("una asignación no apunta a una membresía de otra empresa", async () => {
    await expect(
      e.admin.supervisorInstalacion.create({
        data: { tenantId: idA, membershipId: membresiaB, instalacionId: instA },
      }),
    ).rejects.toThrow(/Foreign key|otra empresa/);
  });

  it("una asignación no apunta a una instalación de otra empresa", async () => {
    await expect(
      e.admin.supervisorInstalacion.create({
        data: { tenantId: idA, membershipId: membresiaA, instalacionId: instB },
      }),
    ).rejects.toThrow(/Foreign key|otra empresa/);
  });
});
