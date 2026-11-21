// CAR-481: el contacto de un cliente ve los accesos de SUS instalaciones en el Portal Cliente, contra Postgres real
// con dos empresas. Otra cuenta, otra empresa o una instalación no habilitada no se ven; documento enmascarado.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { entornoPortalAccesos } from "./acceso-portal-cliente-entorno";

type Reg = { id: string; instalacionId: string; nombre: string; documento: string; patente: string | null };
type Pagina = { items: Reg[]; siguiente: string | null };

describe.skipIf(!urlPropietario)("Accesos en el Portal Cliente, base real (CAR-481)", () => {
  let x: Awaited<ReturnType<typeof entornoPortalAccesos>>;
  const ID = "acceso.portal_registros.listar";

  beforeAll(async () => {
    x = await entornoPortalAccesos();
    await x.entrada(x.t.A, x.inst.X1, "Visita X1");
    await x.entrada(x.t.A, x.inst.X2, "Visita X2");
    await x.entrada(x.t.A, x.inst.Y, "Visita Y");
    await x.entrada(x.t.B, x.inst.B, "Visita B");
  });

  afterAll(async () => {
    await x?.e.cerrar();
  });

  it("el contacto ve solo las instalaciones habilitadas de su cuenta, enmascarado y sin patente", async () => {
    const r = await x.ok<Pagina>(x.contacto("X"), ID, { soloEnSitio: true });
    expect(r.items.map((i) => i.nombre)).toEqual(["Visita X1"]);
    expect(r.items[0]?.documento).not.toContain("345.678");
    expect(r.items[0]?.patente).toBeNull();
  });

  it("una instalación de su cuenta no habilitada, de otra cuenta o de otra empresa responde NOT_FOUND", async () => {
    for (const instalacionId of [x.inst.X2, x.inst.Y, x.inst.B]) {
      const r = await x.run<Pagina>(x.contacto("X"), ID, { instalacionId });
      expect(r.ok ? "ok" : r.error.code).toBe("NOT_FOUND");
    }
  });

  it("cada contacto ve solo lo suyo; el de otra empresa no ve lo de A", async () => {
    const y = await x.ok<Pagina>(x.contacto("Y"), ID, {});
    expect(y.items.map((i) => i.nombre)).toEqual(["Visita Y"]);
    const b = await x.ok<Pagina>(x.contacto("B"), ID, {});
    expect(b.items.map((i) => i.nombre)).toEqual(["Visita B"]);
  });

  it("sin la sección Accesos en el portal de su cuenta, FORBIDDEN", async () => {
    await x.e.admin.configPortalCuenta.update({
      where: { tenantId_cuentaId: { tenantId: x.t.A, cuentaId: x.cuentas.Y } },
      data: { seccionesVisibles: ["cobertura"] },
    });
    const r = await x.run(x.contacto("Y"), ID, {});
    expect(r.ok ? "ok" : r.error.code).toBe("FORBIDDEN");
  });

  it("sin el módulo acceso activo, o como usuario interno, no entra", async () => {
    const sinModulo = await x.run(x.contacto("X", ["portal_cliente"]), ID, {});
    expect(sinModulo.ok).toBe(false);
    const interno = await x.run(x.sistema(x.t.A), ID, {});
    expect(interno.ok ? "ok" : interno.error.code).toBe("FORBIDDEN");
  });

  it("la lectura queda auditada con los ids revelados", async () => {
    const r = await x.ok<Pagina>(x.contacto("X"), ID, {});
    const a = await x.e.admin.auditEvent.findFirstOrThrow({
      where: { tenantId: x.t.A, capability: ID, actorId: x.usuarios.X },
      orderBy: { createdAt: "desc" },
    });
    expect(a.payload).toEqual({ ids: r.items.map((i) => i.id) });
  });
});
