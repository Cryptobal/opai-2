// Brief 11 · Puestos PR 1 (revisión 5658390255): los catálogos del puesto no cruzan tenants ni
// siquiera saltándose RLS, el ciclo del puesto sale de su patrón y un patrón en uso no cambia su
// estructura.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("integridad de puestos, patrones y funciones", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  const ids = { a: "", b: "", instA: "", cargoA: "", patronA: "", patronB: "", funcionB: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    ids.a = (await nuevo(`pi-a-${sufijo}`)).id;
    ids.b = (await nuevo(`pi-b-${sufijo}`)).id;
    const cuenta = await e.admin.cuenta.create({ data: { tenantId: ids.a, nombre: "A" } });
    ids.instA = (
      await e.admin.instalacion.create({ data: { tenantId: ids.a, cuentaId: cuenta.id, nombre: "I" } })
    ).id;
    ids.cargoA = (await e.admin.cargo.create({ data: { tenantId: ids.a, nombre: "Guardia" } })).id;
    const patron = (tenantId: string) =>
      e.admin.patronTurno.create({
        data: { tenantId, nombre: `4x4-${sufijo}`, diasTrabajo: 4, diasDescanso: 4 },
      });
    ids.patronA = (await patron(ids.a)).id;
    ids.patronB = (await patron(ids.b)).id;
    ids.funcionB = (
      await e.admin.funcionPuesto.create({ data: { tenantId: ids.b, nombre: "Guardia" } })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const base = (nombre: string) => ({
    tenantId: ids.a,
    instalacionId: ids.instA,
    cargoId: ids.cargoA,
    nombre,
    diasTrabajo: 5,
    diasDescanso: 2,
    horaInicio: "08:00",
    horaFin: "20:00",
  });

  it("un puesto de A no puede apuntar al patrón ni a la función de B (INSERT y UPDATE)", async () => {
    const cruzado = /Foreign key|otra empresa/;
    await expect(
      e.admin.puesto.create({ data: { ...base("Cruzado P"), patronId: ids.patronB } }),
    ).rejects.toThrow(cruzado);
    await expect(
      e.admin.puesto.create({ data: { ...base("Cruzado F"), funcionId: ids.funcionB } }),
    ).rejects.toThrow(cruzado);
    await expect(
      e.forTenant(ids.a).puesto.create({ data: { ...base("Cruzado RLS"), patronId: ids.patronB } }),
    ).rejects.toThrow();
    const propio = await e.admin.puesto.create({ data: base("Propio") });
    await expect(
      e.admin.puesto.update({ where: { id: propio.id }, data: { patronId: ids.patronB } }),
    ).rejects.toThrow(cruzado);
    await expect(
      e.admin.puesto.update({ where: { id: propio.id }, data: { funcionId: ids.funcionB } }),
    ).rejects.toThrow(cruzado);
  });

  it("el ciclo del puesto sale de su patrón aunque se escriba otro", async () => {
    const p = await e.admin.puesto.create({ data: { ...base("Con patrón"), patronId: ids.patronA } });
    expect([p.diasTrabajo, p.diasDescanso]).toEqual([4, 4]);
    const u = await e.admin.puesto.update({ where: { id: p.id }, data: { diasTrabajo: 9 } });
    expect(u.diasTrabajo).toBe(4);
  });

  it("un patrón en uso no cambia su estructura, pero sí su nombre y su estado", async () => {
    await expect(
      e.admin.patronTurno.update({ where: { id: ids.patronA }, data: { diasTrabajo: 5 } }),
    ).rejects.toThrow(/en uso/);
    await expect(
      e.admin.patronTurno.update({ where: { id: ids.patronA }, data: { diasSemana: [1] } }),
    ).rejects.toThrow(/en uso/);
    const ok = await e.admin.patronTurno.update({
      where: { id: ids.patronA },
      data: { nombre: `4×4-${sufijo}`, activo: false },
    });
    expect(ok.activo).toBe(false);
    // Sin puestos, la estructura sí se puede cambiar.
    const libre = await e.admin.patronTurno.update({
      where: { id: ids.patronB },
      data: { diasTrabajo: 6 },
    });
    expect(libre.diasTrabajo).toBe(6);
  });
});
