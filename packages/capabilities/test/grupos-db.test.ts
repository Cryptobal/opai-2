// CAR-251 · grupos o equipos de usuarios contra Postgres real, con RLS (rol sin BYPASSRLS) y dos
// empresas ficticias: las mismas capacidades de UI, /api/v1 y MCP (la vista previa del MCP es dryRun).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
type Capacidades = typeof ModuloCapacidades;
type Grupo = { id: string; nombre: string; archivado: boolean; miembros: number };

describe.skipIf(!urlPropietario)("grupos de usuarios en base real (CAR-251)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const u = { adminA: "", otroA: "", adminB: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    for (const lado of ["a", "b"] as const) {
      const slug = `grp-${lado}-${sufijo}`;
      t[lado] = (
        await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })
      ).id;
    }
    const usuario = async (tenantId: string, rol: string, nombre: string) => {
      const id = (
        await e.admin.user.create({
          data: { name: nombre, email: `${nombre}-${sufijo}@prueba.test` },
        })
      ).id;
      await e.admin.membership.create({ data: { tenantId, userId: id, rol, portales: ["erp"] } });
      return id;
    };
    u.adminA = await usuario(t.a, "admin", "ana");
    u.otroA = await usuario(t.a, "viewer", "beto");
    u.adminB = await usuario(t.b, "admin", "carla");
  });

  afterAll(async () => await e?.cerrar());

  const ctx = (tenantId: string, userId: string, rol: "owner" | "admin" | "gerente" | "viewer") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "x", email: "x@prueba.test", platformRole: null },
      rol,
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });
  const adminA = () => ctx(t.a, u.adminA, "admin");
  const adminB = () => ctx(t.b, u.adminB, "admin");

  async function dato<T>(c: ReturnType<typeof ctx>, id: string, input: unknown, opciones = {}) {
    const r = await mod.executeCapability(c, id, input, opciones);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function falla(c: ReturnType<typeof ctx>, id: string, input: unknown, code: string) {
    const r = await mod.executeCapability(c, id, input);
    expect(r, id).toMatchObject({ ok: false, error: { code } });
  }
  const auditadas = async (tenantId: string) =>
    (await e.admin.auditEvent.findMany({ where: { tenantId } })).map((a) => a.capability);

  it("la vista previa (dryRun) no escribe ni audita", async () => {
    const antes = await auditadas(t.a);
    const g = await dato<Grupo>(
      adminA(),
      "core.grupos.create",
      { nombre: "Ventas" },
      { dryRun: true },
    );
    expect(g).toMatchObject({ id: "", nombre: "Ventas", miembros: 0 });
    expect(await e.admin.grupoUsuarios.count({ where: { tenantId: t.a } })).toBe(0);
    expect(await auditadas(t.a)).toEqual(antes);
  });

  it("admin crea, edita, suma y quita miembros y archiva; todo queda auditado", async () => {
    const g = await dato<Grupo>(adminA(), "core.grupos.create", { nombre: "Aprobadores" });
    await dato(adminA(), "core.grupos.update", { id: g.id, descripcion: "Cotizaciones grandes" });
    const vista = await dato<{ agregados: string[] }>(
      adminA(),
      "core.grupos.agregar_miembros",
      { grupoId: g.id, userIds: [u.otroA] },
      { dryRun: true },
    );
    expect(vista.agregados).toEqual([u.otroA]);
    expect(await e.admin.grupoUsuarioMiembro.count({ where: { grupoId: g.id } })).toBe(0);
    const suma = await dato<{ agregados: string[]; grupo: Grupo }>(
      adminA(),
      "core.grupos.agregar_miembros",
      {
        grupoId: g.id,
        userIds: [u.adminA, u.otroA],
      },
    );
    expect(suma.grupo.miembros).toBe(2);
    const otraVez = await dato<{ yaEstaban: string[] }>(adminA(), "core.grupos.agregar_miembros", {
      grupoId: g.id,
      userIds: [u.otroA],
    });
    expect(otraVez.yaEstaban).toEqual([u.otroA]);
    const detalle = await dato<{ miembros: { userId: string }[] }>(adminA(), "core.grupos.get", {
      id: g.id,
    });
    expect(detalle.miembros.map((m) => m.userId).sort()).toEqual([u.adminA, u.otroA].sort());
    await dato(adminA(), "core.grupos.quitar_miembro", { grupoId: g.id, userId: u.otroA });
    const archivado = await dato<Grupo>(adminA(), "core.grupos.archive", { id: g.id });
    expect(archivado).toMatchObject({ archivado: true, miembros: 1 });
    // Archivar no borra: la fila sigue y sale de la lista por defecto.
    expect(await e.admin.grupoUsuarios.count({ where: { id: g.id } })).toBe(1);
    expect(await dato<Grupo[]>(adminA(), "core.grupos.list", {})).toEqual([]);
    expect(await auditadas(t.a)).toEqual(
      expect.arrayContaining([
        "core.grupos.create",
        "core.grupos.update",
        "core.grupos.agregar_miembros",
        "core.grupos.quitar_miembro",
        "core.grupos.archive",
        "core.grupos.get",
      ]),
    );
    await falla(adminA(), "core.grupos.update", { id: g.id, nombre: "Otro" }, "UNPROCESSABLE");
  });

  it("una empresa no ve ni modifica grupos de otra, ni suma usuarios ajenos", async () => {
    const gB = await dato<Grupo>(adminB(), "core.grupos.create", { nombre: "Equipo B" });
    expect(
      (await dato<Grupo[]>(adminA(), "core.grupos.list", { incluirArchivados: true })).map(
        (g) => g.id,
      ),
    ).not.toContain(gB.id);
    for (const [id, input] of [
      ["core.grupos.get", { id: gB.id }],
      ["core.grupos.update", { id: gB.id, nombre: "Tomado" }],
      ["core.grupos.archive", { id: gB.id }],
      ["core.grupos.agregar_miembros", { grupoId: gB.id, userIds: [u.adminA] }],
    ] as const) {
      await falla(adminA(), id, input, "NOT_FOUND");
    }
    const gA = await dato<Grupo>(adminA(), "core.grupos.create", { nombre: "Equipo A" });
    const ajeno = { grupoId: gA.id, userIds: [u.adminB] };
    await falla(adminA(), "core.grupos.agregar_miembros", ajeno, "UNPROCESSABLE");
    const intacto = await e.admin.grupoUsuarios.findUnique({ where: { id: gB.id } });
    expect(intacto).toMatchObject({ nombre: "Equipo B", archivadoEn: null });
  });

  it("el nombre se repite solo si el otro está archivado", async () => {
    await falla(adminA(), "core.grupos.create", { nombre: "equipo a" }, "UNPROCESSABLE");
    const otra = await dato<Grupo>(adminA(), "core.grupos.create", { nombre: "Aprobadores" });
    expect(otra.nombre).toBe("Aprobadores");
  });
});
