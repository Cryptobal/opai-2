import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("portales de membresías reales", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  let tenantA = "";
  let tenantB = "";
  const userId = randomUUID();

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const crear = async () =>
      (
        await e.admin.tenant.create({
          data: {
            slug: `portal-${randomUUID()}`,
            nombre: "Portal prueba",
            vertical: "seguridad",
          },
        })
      ).id;
    tenantA = await crear();
    tenantB = await crear();
    await e.admin.user.create({
      data: { id: userId, name: "Supervisor", email: `${userId}@prueba.cl` },
    });
    await e.admin.membership.createMany({
      data: [
        { tenantId: tenantA, userId, rol: "supervisor", portales: ["supervisor"] },
        { tenantId: tenantB, userId, rol: "owner", portales: ["erp"] },
      ],
    });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  // Mismo origen servidor que fuentesReales: forUser devuelve solo las membresías propias.
  async function contexto(tenantId: string, portal: string | null) {
    const filas = await e.forUser(userId).membership.findMany({ include: { tenant: true } });
    const m = filas.find(
      (m) => m.tenantId === tenantId && m.estado === "activa" && m.tenant.estado !== "suspendido",
    );
    return mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: {
        id: userId,
        nombre: "Supervisor",
        email: `${userId}@prueba.cl`,
        platformRole: null,
      },
      rol: m?.rol === "owner" ? "owner" : "supervisor",
      portal,
      portalesMembresia: m?.portales ?? [],
      medidor: { registrar: async () => undefined },
    });
  }

  it("ERP de otro tenant no concede ERP en el tenant Supervisor", async () => {
    for (const portal of ["erp", "supervisor", "inventado", null, ""]) {
      const r = await mod.executeCapability(await contexto(tenantA, portal), "core.buscar", {
        q: "Alfa",
      });
      expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      if (portal !== "supervisor")
        expect(r).toMatchObject({ error: { message: "No tienes acceso a este portal." } });
    }
    const ok = await mod.executeCapability(await contexto(tenantB, "erp"), "core.buscar", {
      q: "Alfa",
    });
    expect(ok).toMatchObject({ ok: true });
  });

  it("sin membresía activa no hay acceso aunque el usuario tenga rol y portal en otro tenant", async () => {
    await e.admin.membership.updateMany({
      where: { tenantId: tenantA, userId },
      data: { estado: "suspendida" },
    });
    const r = await mod.executeCapability(await contexto(tenantA, "supervisor"), "core.geo.mapa", {
      lat: -33,
      lng: -70,
      zoom: 14,
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." },
    });
  });

  it("la campana del Supervisor lista y marca los avisos propios, sin ver los de otro usuario ni de otro tenant", async () => {
    await e.admin.membership.updateMany({
      where: { tenantId: tenantA, userId },
      data: { estado: "activa" },
    });
    const otroUsuarioId = randomUUID();
    await e.admin.user.create({
      data: { id: otroUsuarioId, name: "Otra persona", email: `${otroUsuarioId}@prueba.cl` },
    });
    const propia = await e.admin.notificacion.create({
      data: { tenantId: tenantA, usuarioId: userId, titulo: "Propia en A" },
    });
    const deOtroUsuario = await e.admin.notificacion.create({
      data: { tenantId: tenantA, usuarioId: otroUsuarioId, titulo: "De otro usuario en A" },
    });
    const deOtroTenant = await e.admin.notificacion.create({
      data: { tenantId: tenantB, usuarioId: userId, titulo: "Propia en B" },
    });

    const ctxSupervisor = await contexto(tenantA, "supervisor");
    const lista = await mod.executeCapability(ctxSupervisor, "core.notificaciones.list", {});
    expect(lista).toMatchObject({
      ok: true,
      data: { items: [{ id: propia.id, titulo: "Propia en A" }], noLeidas: 1 },
    });

    const ajena = await mod.executeCapability(ctxSupervisor, "core.notificaciones.marcar_leida", {
      id: deOtroUsuario.id,
    });
    expect(ajena).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });

    const deOtraEmpresa = await mod.executeCapability(
      ctxSupervisor,
      "core.notificaciones.marcar_leida",
      { id: deOtroTenant.id },
    );
    expect(deOtraEmpresa).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });

    const propiaOk = await mod.executeCapability(ctxSupervisor, "core.notificaciones.marcar_leida", {
      id: propia.id,
    });
    expect(propiaOk).toMatchObject({ ok: true });

    const todas = await mod.executeCapability(ctxSupervisor, "core.notificaciones.marcar_todas", {});
    expect(todas).toMatchObject({ ok: true, data: { marcadas: 0 } });

    const ajenaSigueNoLeida = await e.admin.notificacion.findUniqueOrThrow({
      where: { id: deOtroUsuario.id },
    });
    expect(ajenaSigueNoLeida.leidaEn).toBeNull();
    const otraEmpresaSigueNoLeida = await e.admin.notificacion.findUniqueOrThrow({
      where: { id: deOtroTenant.id },
    });
    expect(otraEmpresaSigueNoLeida.leidaEn).toBeNull();
  });
});
