import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { prepararEntorno } from "../../db/test/entorno";
import {
  capacidadesDelNucleo,
  crearContexto,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";

export async function prepararVinculosJornada() {
  const e = await prepararEntorno();
  let tenantId = "",
    personaId = "",
    cargoId = "",
    a = "",
    b = "",
    ajena = "",
    puestoId = "";
  const ctx = (
    rol: "owner" | "gerente" | "supervisor" = "owner",
    alcance: string[] | null = null,
    tenant = tenantId,
  ) =>
    crearContexto({
      tenantId: tenant,
      rol,
      actor: { tipo: "system" },
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}),
    });
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  tenantId = (
    await e.admin.tenant.create({
      data: { slug: `vinc-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
    })
  ).id;
  const otro = (
    await e.admin.tenant.create({
      data: { slug: `vinc-${randomUUID()}`, nombre: "Otra", vertical: "seguridad" },
    })
  ).id;
  for (const t of [tenantId, otro]) {
    const db = e.forTenant(t);
    const cuenta = await db.cuenta.create({ data: { tenantId: t, nombre: "Prueba" } });
    const i = await db.instalacion.create({
      data: { tenantId: t, cuentaId: cuenta.id, nombre: "Norte" },
    });
    if (t === otro) {
      ajena = i.id;
      continue;
    }
    a = i.id;
    b = (await db.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre: "Sur" } }))
      .id;
    cargoId = (await db.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
    personaId = (
      await db.persona.create({
        data: { tenantId, nombres: "Persona", apellidos: "Ficticia", rut: "12345678-5" },
      })
    ).id;
    puestoId = (
      await db.puesto.create({
        data: {
          tenantId,
          cargoId,
          instalacionId: b,
          nombre: "Día",
          diasTrabajo: 5,
          diasDescanso: 2,
          horaInicio: "08:00",
          horaFin: "16:00",
        },
      })
    ).id;
    for (const ref of [
      { nivel: "instalacion", instalacionId: a },
      { nivel: "puesto", puestoId },
    ]) {
      const r = await executeCapability(ctx(), "core.estructuras.create", {
        ...ref,
        sueldoBase: ref.nivel === "puesto" ? 700000 : 600000,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "ninguna",
        vigenteDesde: "2026-01-01",
      });
      expect(r.ok).toBe(true);
    }
  }
  return { e, tenantId, otro, personaId, cargoId, a, b, ajena, puestoId };
}

export async function comprobarIntegridadVinculo(
  f: Awaited<ReturnType<typeof prepararVinculosJornada>>,
  id: string,
) {
  const { e, tenantId, otro, personaId, cargoId, a, ajena, puestoId } = f;

  const db = e.forTenant(tenantId);
  expect(await e.appSinTenant.vinculoLaboral.findMany({ where: { id } })).toEqual([]);
  expect(await e.forTenant(otro).vinculoLaboral.findMany({ where: { id } })).toEqual([]);
  await expect(
    db.vinculoLaboral.update({ where: { id }, data: { instalacionId: ajena } }),
  ).rejects.toThrow();
  await expect(
    db.vinculoLaboral.update({ where: { id }, data: { instalacionId: a, puestoId } }),
  ).rejects.toThrow();
  await expect(
    db.vinculoLaboral.create({
      data: {
        tenantId,
        personaId,
        cargoId,
        tipo: "indefinido",
        inicio: new Date(),
        estado: "vigente",
      },
    }),
  ).rejects.toThrow();
  await expect(
    db.puesto.update({ where: { id: puestoId }, data: { instalacionId: a } }),
  ).rejects.toThrow();
}
