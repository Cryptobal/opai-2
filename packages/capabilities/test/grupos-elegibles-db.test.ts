// CAR-251 · solo usuarios internos activos entran a un grupo: un contacto del portal cliente o un
// usuario suspendido no queda en un grupo que CAR-252 podrá nombrar como aprobador. Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("grupos: miembros elegibles (CAR-251)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const u = { admin: "", cliente: "", suspendido: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `grpe-${sufijo}`, nombre: "E", vertical: "aseo" },
      })
    ).id;
    const usuario = async (nombre: string, portales: string[], estado = "activa") => {
      const id = (
        await e.admin.user.create({
          data: { name: nombre, email: `${nombre}-${sufijo}@prueba.test` },
        })
      ).id;
      await e.admin.membership.create({
        data: { tenantId, userId: id, rol: "viewer", portales, estado },
      });
      return id;
    };
    u.admin = await usuario("admin", ["erp"]);
    u.cliente = await usuario("cliente", ["cliente"]);
    u.suspendido = await usuario("suspendido", ["erp"], "suspendida");
  });

  afterAll(async () => await e?.cerrar());

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: u.admin },
      usuario: { id: u.admin, nombre: "x", email: "x@prueba.test", platformRole: null },
      rol: "admin",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });

  it("rechaza un contacto del portal cliente y un usuario suspendido; acepta al interno activo", async () => {
    const g = await mod.executeCapability(ctx(), "core.grupos.create", { nombre: "Aprobadores" });
    if (!g.ok) throw new Error(JSON.stringify(g.error));
    const grupoId = (g.data as { id: string }).id;
    for (const userId of [u.cliente, u.suspendido]) {
      const r = await mod.executeCapability(ctx(), "core.grupos.agregar_miembros", {
        grupoId,
        userIds: [userId],
      });
      expect(r, userId).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    }
    const ok = await mod.executeCapability(ctx(), "core.grupos.agregar_miembros", {
      grupoId,
      userIds: [u.admin],
    });
    expect(ok).toMatchObject({ ok: true, data: { agregados: [u.admin] } });
    const audit = await e.admin.auditEvent.findFirst({
      where: { tenantId, capability: "core.grupos.agregar_miembros" },
    });
    expect(audit?.payload).toMatchObject({ grupoId, agregados: [u.admin], yaEstaban: [] });
    const alta = await e.admin.auditEvent.findFirst({
      where: { tenantId, capability: "core.grupos.create" },
    });
    expect(alta).toMatchObject({ entityType: "grupo", entityId: grupoId });
  });

  it("dos altas simultáneas del mismo usuario: solo una lo informa y emite el evento", async () => {
    const g = await mod.executeCapability(ctx(), "core.grupos.create", { nombre: "Concurrencia" });
    if (!g.ok) throw new Error(JSON.stringify(g.error));
    const grupoId = (g.data as { id: string }).id;
    const input = { grupoId, userIds: [u.admin] };
    const rs = await Promise.all([
      mod.executeCapability(ctx(), "core.grupos.agregar_miembros", input),
      mod.executeCapability(ctx(), "core.grupos.agregar_miembros", input),
    ]);
    expect(rs.every((r) => r.ok)).toBe(true);
    const agregados = rs.flatMap((r) =>
      r.ok ? (r.data as { agregados: string[] }).agregados : [],
    );
    expect(agregados).toEqual([u.admin]);
    const eventos = await e.admin.evento.count({
      where: { tenantId, tipo: "core.grupo.miembros_agregados", entidadId: grupoId },
    });
    expect(eventos).toBe(1);
  });

  it("la app no borra grupos en duro (sin DELETE para opai_app)", async () => {
    await expect(e.forTenant(tenantId).grupoUsuarios.deleteMany({})).rejects.toThrow();
  });
});
