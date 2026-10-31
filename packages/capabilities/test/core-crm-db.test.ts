import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { codigo, dato } from "./maestros-ayuda";

// CRM PR 2a (CAR-26) contra Postgres real (RLS sin BYPASSRLS): vínculo contacto–cuenta (trigger y
// relleno), actividad unificada y etiquetas. Datos ficticios.
describe("core · contacto N–N, actividad y etiquetas contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let userId = "";
  let cuentaA1 = "";
  let cuentaA2 = "";
  let cuentaB = "";
  let contactoA = "";
  let instalacionA = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["comercial"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`crm-a-${sufijo}`)).id;
    b = (await nuevo(`crm-b-${sufijo}`)).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId: a, userId, rol: "owner", portales: ["erp"] },
    });
    const cuenta = (tenantId: string, nombre: string) =>
      e.admin.cuenta.create({ data: { tenantId, nombre, estado: "prospecto" } }).then((c) => c.id);
    cuentaA1 = await cuenta(a, "Cuenta Alfa");
    cuentaA2 = await cuenta(a, "Cuenta Beta");
    cuentaB = await cuenta(b, "Cuenta Gamma");
    instalacionA = (
      await e.admin.instalacion.create({
        data: { tenantId: a, cuentaId: cuentaA1, nombre: "Planta 1", estado: "prospecto" },
      })
    ).id;
    contactoA = (
      await dato<{ id: string }>(ctx(a), "core.contactos.create", {
        cuentaId: cuentaA1,
        nombres: "Pía",
        apellidos: "Prueba",
        email: `pia-${sufijo}@ejemplo.test`,
        cargo: "Jefa de operaciones",
        esPrincipal: true,
        roles: ["comercial"],
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("crear un contacto crea su vínculo inicial (trigger) y editar roles lo sincroniza", async () => {
    const v = await e.admin.contactoCuenta.findMany({ where: { contactoId: contactoA } });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({
      cuentaId: cuentaA1,
      cargo: "Jefa de operaciones",
      esPrincipal: true,
    });
    await dato(ctx(a), "core.contactos.update", { id: contactoA, roles: ["operacional"] });
    const despues = await e.admin.contactoCuenta.findFirstOrThrow({
      where: { contactoId: contactoA },
    });
    expect(despues.roles).toEqual(["operacional"]);
  });

  it("vincula a otra cuenta, un solo principal por cuenta y desvincular reasigna la cuenta inicial", async () => {
    await dato(ctx(a), "core.contactos.vincular", {
      contactoId: contactoA,
      cuentaId: cuentaA2,
      cargo: "Compras",
      roles: ["facturacion", "cesion"],
      esPrincipal: true,
    });
    const otro = await dato<{ id: string }>(ctx(a), "core.contactos.create", {
      cuentaId: cuentaA2,
      nombres: "Leo",
      apellidos: "Paz",
      esPrincipal: true,
    });
    const principales = await e.admin.contactoCuenta.findMany({
      where: { cuentaId: cuentaA2, esPrincipal: true },
    });
    expect(principales.map((p) => p.contactoId)).toEqual([otro.id]);
    await dato(ctx(a), "core.contactos.desvincular", { contactoId: contactoA, cuentaId: cuentaA1 });
    const c = await e.admin.contacto.findUniqueOrThrow({ where: { id: contactoA } });
    expect(c.cuentaId).toBe(cuentaA2);
    expect(c.cargo).toBe("Compras");
    const lista = await dato<{ contactoId: string }[]>(ctx(a), "core.cuentas.contactos", {
      cuentaId: cuentaA2,
    });
    expect(lista.map((x) => x.contactoId).sort()).toEqual([contactoA, otro.id].sort());
  });

  it("otra empresa no ve ni vincula los contactos de la primera (RLS y mismo tenant)", async () => {
    expect(await codigo(ctx(b), "core.contactos.cuentas", { contactoId: contactoA })).toBe(
      "NOT_FOUND",
    );
    expect(
      await codigo(ctx(a), "core.contactos.vincular", { contactoId: contactoA, cuentaId: cuentaB }),
    ).toBe("NOT_FOUND");
    await expect(
      e.admin.contactoCuenta.create({
        data: { tenantId: a, contactoId: contactoA, cuentaId: cuentaB },
      }),
    ).rejects.toThrow();
  });

  it("la actividad se liga a varias entidades, hace timeline, y borrarla borra sus vínculos", async () => {
    const t = await dato<{ id: string; responsables: string[] }>(
      ctx(a),
      "core.actividades.create",
      {
        tipo: "tarea",
        titulo: "Enviar propuesta",
        vencimiento: "2026-12-01T15:00:00Z",
        vinculos: [
          { tipo: "cuenta", id: cuentaA2 },
          { tipo: "contacto", id: contactoA },
          { tipo: "instalacion", id: instalacionA },
        ],
      },
    );
    expect(t.responsables).toEqual([userId]);
    for (const [entidadTipo, entidadId] of [
      ["cuenta", cuentaA2],
      ["contacto", contactoA],
      ["instalacion", instalacionA],
    ] as const) {
      const tl = await dato<{ items: { id: string }[] }>(ctx(a), "core.actividades.timeline", {
        entidadTipo,
        entidadId,
      });
      expect(tl.items.map((i) => i.id)).toEqual([t.id]);
    }
    expect(
      (
        await dato<{ items: unknown[] }>(ctx(b), "core.actividades.tareas", {
          responsableId: userId,
        })
      ).items,
    ).toHaveLength(0);
    expect(
      await codigo(ctx(b), "core.actividades.timeline", {
        entidadTipo: "cuenta",
        entidadId: cuentaA2,
      }),
    ).toBe("NOT_FOUND");
    await dato(ctx(a), "core.actividades.completar", { id: t.id });
    await dato(ctx(a), "core.actividades.delete", { id: t.id });
    expect(await e.admin.actividadVinculo.count({ where: { actividadId: t.id } })).toBe(0);
    expect(await e.admin.actividadResponsable.count({ where: { actividadId: t.id } })).toBe(0);
  });

  it("la base rechaza un vínculo de actividad con dos entidades o con una de otra empresa", async () => {
    const act = await e.admin.actividad.create({
      data: { tenantId: a, tipo: "nota", titulo: "Nota", estado: null },
    });
    await expect(
      e.admin.actividadVinculo.create({
        data: { tenantId: a, actividadId: act.id, cuentaId: cuentaA1, contactoId: contactoA },
      }),
    ).rejects.toThrow();
    await expect(
      e.admin.actividadVinculo.create({
        data: { tenantId: a, actividadId: act.id, cuentaId: cuentaB },
      }),
    ).rejects.toThrow();
  });

  it("etiquetas: nombre único sin distinguir mayúsculas, asignación en lote y borrado con asignaciones", async () => {
    const et = await dato<{ id: string }>(ctx(a), "core.etiquetas.create", { nombre: "Minería" });
    expect(await codigo(ctx(a), "core.etiquetas.create", { nombre: "minería" })).toBe("CONFLICT");
    expect(await codigo(ctx(b), "core.etiquetas.create", { nombre: "Minería" })).toBe("OK");
    const entrada = {
      entidadTipo: "cuenta",
      entidadIds: [cuentaA1, cuentaA2],
      etiquetaIds: [et.id],
    };
    expect(await dato(ctx(a), "core.etiquetas.asignar", entrada)).toEqual({
      asignadas: 2,
      yaEstaban: 0,
    });
    expect(await dato(ctx(a), "core.etiquetas.asignar", entrada)).toEqual({
      asignadas: 0,
      yaEstaban: 2,
    });
    expect(await codigo(ctx(b), "core.etiquetas.asignar", entrada)).toBe("NOT_FOUND");
    expect(
      await dato(ctx(a), "core.etiquetas.delete", { id: et.id }, { dryRun: true }),
    ).toMatchObject({
      asignacionesQuitadas: 2,
    });
    await dato(ctx(a), "core.etiquetas.delete", { id: et.id });
    expect(await e.admin.etiquetaAsignacion.count({ where: { etiquetaId: et.id } })).toBe(0);
  });

  it("las escrituras reales quedan en la auditoría y la vista previa no", async () => {
    const antes = await e.admin.auditEvent.count({
      where: { tenantId: a, capability: "core.etiquetas.create" },
    });
    await dato(ctx(a), "core.etiquetas.create", { nombre: "Solo vista previa" }, { dryRun: true });
    expect(
      await e.admin.auditEvent.count({
        where: { tenantId: a, capability: "core.etiquetas.create" },
      }),
    ).toBe(antes);
    expect(antes).toBeGreaterThan(0);
  });
});
