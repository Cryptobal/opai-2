// Brief 16 · Portal Cliente PR 1 (CAR-88): aislamiento por tenant de las tablas `portal_cliente.*` y
// sus invariantes de integridad (misma empresa; la instalación habilitada es de la cuenta del
// acceso). El estándar de RLS y política lo cubren rls-nucleo*.test.ts sobre toda tabla con tenant_id.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("RLS del Portal Cliente (Brief 16 · PR 1)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let membresiaA = "";
  let membresiaB = "";
  let cuentaA1 = "";
  let cuentaA2 = "";
  let cuentaB = "";
  let instA1 = "";
  let instA2 = "";
  let instB = "";
  let accesoA = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevoTenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevoTenant(`pc-a-${sufijo}`)).id;
    idB = (await nuevoTenant(`pc-b-${sufijo}`)).id;
    const usuario = (n: string) =>
      e.admin.user.create({ data: { id: randomUUID(), name: n, email: `${n}-${sufijo}@prueba.cl` } });
    const uA = await usuario("clA");
    const uB = await usuario("clB");
    membresiaA = (await e.admin.membership.create({ data: { tenantId: idA, userId: uA.id, rol: "viewer", portales: ["cliente"] } })).id;
    membresiaB = (await e.admin.membership.create({ data: { tenantId: idB, userId: uB.id, rol: "viewer", portales: ["cliente"] } })).id;
    const cuenta = async (tenantId: string, nombre: string) =>
      (await e.admin.cuenta.create({ data: { tenantId, nombre } })).id;
    cuentaA1 = await cuenta(idA, `Cuenta A1 ${sufijo}`);
    cuentaA2 = await cuenta(idA, `Cuenta A2 ${sufijo}`);
    cuentaB = await cuenta(idB, `Cuenta B ${sufijo}`);
    const inst = async (tenantId: string, cuentaId: string, nombre: string) =>
      (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
    instA1 = await inst(idA, cuentaA1, "Planta A1");
    instA2 = await inst(idA, cuentaA2, "Planta A2");
    instB = await inst(idB, cuentaB, "Planta B");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada tenant ve y crea solo sus accesos, instalaciones habilitadas y configuración", async () => {
    const a = e.forTenant(idA);
    const b = e.forTenant(idB);
    accesoA = (await a.accesoCliente.create({ data: { tenantId: idA, membershipId: membresiaA, cuentaId: cuentaA1 } })).id;
    await a.accesoInstalacion.create({ data: { tenantId: idA, accesoId: accesoA, instalacionId: instA1 } });
    await a.configPortalCuenta.create({ data: { tenantId: idA, cuentaId: cuentaA1 } });
    await b.accesoCliente.create({ data: { tenantId: idB, membershipId: membresiaB, cuentaId: cuentaB } });

    expect(await a.accesoCliente.findMany()).toHaveLength(1);
    expect(await a.accesoInstalacion.findMany()).toHaveLength(1);
    expect(await a.configPortalCuenta.findMany()).toHaveLength(1);
    // B no ve nada de A aunque pida el id directo.
    expect(await b.accesoCliente.findUnique({ where: { id: accesoA } })).toBeNull();
    expect(await b.accesoInstalacion.findMany()).toHaveLength(0);
    expect(await b.configPortalCuenta.findMany()).toHaveLength(0);
    // Ni crear una fila de otro tenant (RLS WITH CHECK) ni modificar la ajena.
    await expect(
      a.accesoCliente.create({ data: { tenantId: idB, membershipId: membresiaB, cuentaId: cuentaB } }),
    ).rejects.toThrow();
    expect((await b.accesoCliente.updateMany({ where: { id: accesoA }, data: { estado: "revocado" } })).count).toBe(0);
  });

  it("un acceso no apunta a una membresía ni a una cuenta de otra empresa", async () => {
    await expect(
      e.admin.accesoCliente.create({ data: { tenantId: idA, membershipId: membresiaB, cuentaId: cuentaA1 } }),
    ).rejects.toThrow(/otra empresa|Foreign key/);
    await expect(
      e.admin.accesoCliente.create({ data: { tenantId: idA, membershipId: membresiaA, cuentaId: cuentaB } }),
    ).rejects.toThrow(/otra empresa|Foreign key/);
  });

  it("una membresía tiene un solo acceso por empresa", async () => {
    await expect(
      e.admin.accesoCliente.create({ data: { tenantId: idA, membershipId: membresiaA, cuentaId: cuentaA2 } }),
    ).rejects.toThrow(/Unique|unique/);
  });

  it("una instalación habilitada no es de otra empresa ni de otra cuenta de la misma empresa", async () => {
    await expect(
      e.admin.accesoInstalacion.create({ data: { tenantId: idA, accesoId: accesoA, instalacionId: instB } }),
    ).rejects.toThrow(/otra empresa|Foreign key/);
    await expect(
      e.admin.accesoInstalacion.create({ data: { tenantId: idA, accesoId: accesoA, instalacionId: instA2 } }),
    ).rejects.toThrow(/no pertenece a la cuenta/);
  });

  it("el estado del acceso y el RUT en reportes solo admiten sus valores", async () => {
    await expect(
      e.admin.accesoCliente.update({ where: { id: accesoA }, data: { estado: "inventado" } }),
    ).rejects.toThrow(/check|accesos_estado_check/i);
    await expect(
      e.admin.configPortalCuenta.updateMany({ where: { tenantId: idA }, data: { rutEnReportes: "siempre" } }),
    ).rejects.toThrow(/check|rut_en_reportes/i);
  });

  it("revocar la membresía o borrar la cuenta se lleva el acceso (CASCADE), nunca queda huérfano", async () => {
    const user = await e.admin.user.create({ data: { id: randomUUID(), name: "tmp", email: `tmp-${sufijo}@prueba.cl` } });
    const m = await e.admin.membership.create({ data: { tenantId: idA, userId: user.id, rol: "viewer", portales: ["cliente"] } });
    const c = await e.admin.cuenta.create({ data: { tenantId: idA, nombre: `Temporal ${sufijo}` } });
    const acc = await e.admin.accesoCliente.create({ data: { tenantId: idA, membershipId: m.id, cuentaId: c.id } });
    await e.admin.membership.delete({ where: { id: m.id } });
    expect(await e.admin.accesoCliente.findUnique({ where: { id: acc.id } })).toBeNull();
    await e.admin.cuenta.delete({ where: { id: c.id } });
  });
});
