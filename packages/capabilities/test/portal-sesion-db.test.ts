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
});
