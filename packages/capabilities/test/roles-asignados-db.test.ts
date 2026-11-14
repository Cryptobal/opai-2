// CAR-359 · roles adicionales de un miembro y roles de grupo contra Postgres real, con RLS (rol sin
// BYPASSRLS) y dos empresas ficticias: asignar, quitar, listar, nadie concede más de lo que tiene y
// sumar a un grupo con roles es de personas que podrían conceder esos roles.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
type Capacidades = typeof ModuloCapacidades;
type Lista = { items: { roleId: string; nombre: string; archivado: boolean }[] };

describe.skipIf(!urlPropietario)("roles adicionales y de grupo en base real (CAR-359)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const u = { adminA: "", viewerA: "", adminB: "" };
  const m = { viewerA: "" };
  let rolRendiciones = "";
  let rolFinanzas = "";
  let grupo = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    for (const lado of ["a", "b"] as const) {
      const slug = `rad-${lado}-${sufijo}`;
      t[lado] = (
        await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })
      ).id;
    }
    const usuario = async (tenantId: string, rol: string, nombre: string) => {
      const id = (
        await e.admin.user.create({ data: { name: nombre, email: `${nombre}-${sufijo}@x.test` } })
      ).id;
      const mm = await e.admin.membership.create({
        data: { tenantId, userId: id, rol, portales: ["erp"] },
      });
      return { id, membershipId: mm.id };
    };
    u.adminA = (await usuario(t.a, "admin", "ana")).id;
    const v = await usuario(t.a, "viewer", "beto");
    u.viewerA = v.id;
    m.viewerA = v.membershipId;
    u.adminB = (await usuario(t.b, "admin", "carla")).id;
    const rol = (nombre: string, permisos: string[]) =>
      e.admin.rol.create({ data: { tenantId: t.a, nombre, permisos } }).then((r) => r.id);
    rolRendiciones = await rol("Aprueba rendiciones", ["core:cuentas.read"]);
    rolFinanzas = await rol("Finanzas", ["core:cuentas.manage"]);
    grupo = (await e.admin.grupoUsuarios.create({ data: { tenantId: t.a, nombre: "Caja" } })).id;
  });

  afterAll(async () => await e?.cerrar());

  const ctx = (
    tenantId: string,
    userId: string,
    rol: "admin" | "gerente",
    extra: Partial<Parameters<Capacidades["crearContexto"]>[0]> = {},
  ) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "x", email: "x@x.test", platformRole: null },
      rol,
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
      ...extra,
    });
  const adminA = () => ctx(t.a, u.adminA, "admin");
  const ejecutar = (c: ReturnType<typeof ctx>, id: string, input: unknown, opciones = {}) =>
    mod.executeCapability(c, id, input, opciones);
  async function dato<T>(c: ReturnType<typeof ctx>, id: string, input: unknown, opciones = {}) {
    const r = await ejecutar(c, id, input, opciones);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  it("admin suma y quita un rol adicional; la vista previa no escribe", async () => {
    const entrada = { membershipId: m.viewerA, roleId: rolRendiciones };
    await dato(adminA(), "core.roles.adicional_asignar", entrada, { dryRun: true });
    expect(await e.admin.rolMiembro.count({ where: { tenantId: t.a } })).toBe(0);
    expect(await dato(adminA(), "core.roles.adicional_asignar", entrada)).toMatchObject({
      cambio: true,
    });
    expect(await dato(adminA(), "core.roles.adicional_asignar", entrada)).toMatchObject({
      cambio: false,
    });
    const l = await dato<Lista>(adminA(), "core.roles.adicionales_list", {
      membershipId: m.viewerA,
    });
    expect(l.items).toEqual([
      { roleId: rolRendiciones, nombre: "Aprueba rendiciones", archivado: false },
    ]);
    await dato(adminA(), "core.roles.adicional_quitar", entrada);
    expect(await e.admin.rolMiembro.count({ where: { tenantId: t.a } })).toBe(0);
  });

  it("nadie asigna un rol con permisos que no tiene, ni a un miembro ni a un grupo", async () => {
    const sinFinanzas = ctx(t.a, u.adminA, "admin", {
      excepciones: [{ permiso: "core:cuentas.manage", conceder: false }],
    });
    const r1 = await ejecutar(sinFinanzas, "core.roles.adicional_asignar", {
      membershipId: m.viewerA,
      roleId: rolFinanzas,
    });
    expect(r1).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const r2 = await ejecutar(sinFinanzas, "core.grupos.rol_asignar", {
      grupoId: grupo,
      roleId: rolFinanzas,
    });
    expect(r2).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const gerente = ctx(t.a, u.adminA, "gerente");
    const r3 = await ejecutar(gerente, "core.grupos.rol_asignar", {
      grupoId: grupo,
      roleId: rolRendiciones,
    });
    expect(r3).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("sumar a un grupo con roles exige poder conceder esos roles", async () => {
    await dato(adminA(), "core.grupos.rol_asignar", { grupoId: grupo, roleId: rolFinanzas });
    const l = await dato<Lista>(adminA(), "core.grupos.roles_list", { grupoId: grupo });
    expect(l.items.map((i) => i.roleId)).toEqual([rolFinanzas]);
    const sinFinanzas = ctx(t.a, u.adminA, "admin", {
      excepciones: [{ permiso: "core:cuentas.manage", conceder: false }],
    });
    const r = await ejecutar(sinFinanzas, "core.grupos.agregar_miembros", {
      grupoId: grupo,
      userIds: [u.viewerA],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    await dato(adminA(), "core.grupos.agregar_miembros", { grupoId: grupo, userIds: [u.viewerA] });
    await dato(adminA(), "core.grupos.rol_quitar", { grupoId: grupo, roleId: rolFinanzas });
    expect(await e.admin.rolGrupo.count({ where: { tenantId: t.a } })).toBe(0);
  });

  it("otra empresa no ve ni asigna roles de la primera (RLS)", async () => {
    const adminB = ctx(t.b, u.adminB, "admin");
    const r = await ejecutar(adminB, "core.roles.adicional_asignar", {
      membershipId: m.viewerA,
      roleId: rolRendiciones,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const g = await ejecutar(adminB, "core.grupos.roles_list", { grupoId: grupo });
    expect(g).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
