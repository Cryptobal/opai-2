// CAR-147 / CAR-143 · permiso de carga CAF (decisión Carlos 12:43 CLT): configure, no solo ventas.manage.
import { beforeAll, describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { capacidadesFinanzas } from "../src/finanzas";

const xmlMin =
  "<CAF><DA><RE>76111222-8</RE><TD>33</TD><RNG><D>1</D><H>2</H></RNG><FA>2026-01-01</FA></DA></CAF>";

describe("Finanzas · folios · permisos CAF", () => {
  beforeAll(() => {
    limpiarRegistro();
    registrarCapacidades(capacidadesFinanzas);
  });

  it("solo ventas.manage recibe FORBIDDEN al cargar CAF", async () => {
    const { ctx } = contextoDePrueba({
      rol: null,
      permisosRol: ["finanzas:read", "finanzas:ventas.manage"],
      modulosActivos: ["finanzas"],
    });
    const r = await executeCapability(ctx, "finanzas.folios.cargar_caf", { cafXml: xmlMin }, { dryRun: true });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("solo ventas.manage puede listar folios", async () => {
    const { ctx } = contextoDePrueba({
      rol: null,
      permisosRol: ["finanzas:read", "finanzas:ventas.manage"],
      modulosActivos: ["finanzas"],
    });
    const r = await executeCapability(ctx, "finanzas.folios.listar", {});
    expect(r).toMatchObject({ ok: true, data: { items: [] } });
  });

  it("owner y admin no reciben FORBIDDEN", async () => {
    for (const rol of ["owner", "admin"] as const) {
      const { ctx } = contextoDePrueba({ rol, modulosActivos: ["finanzas"] });
      const r = await executeCapability(ctx, "finanzas.folios.cargar_caf", { cafXml: xmlMin }, { dryRun: true });
      if (!r.ok) expect(r.error.code, rol).not.toBe("FORBIDDEN");
    }
  });

  it("rol personalizado con ventas.configure no recibe FORBIDDEN", async () => {
    const { ctx } = contextoDePrueba({
      rol: null,
      permisosRol: ["finanzas:read", "finanzas:ventas.configure"],
      modulosActivos: ["finanzas"],
    });
    const r = await executeCapability(ctx, "finanzas.folios.cargar_caf", { cafXml: xmlMin }, { dryRun: true });
    if (!r.ok) expect(r.error.code).not.toBe("FORBIDDEN");
  });

  it("un agente (API key) no puede cargar CAF (soloPersonas)", async () => {
    const { ctx } = contextoDePrueba({
      usuario: USUARIO_DE_PRUEBA,
      actor: { tipo: "agent", id: USUARIO_DE_PRUEBA.id, viaUserId: USUARIO_DE_PRUEBA.id },
      scopes: ["*"],
      modulosActivos: ["finanzas"],
    });
    const r = await executeCapability(ctx, "finanzas.folios.cargar_caf", { cafXml: xmlMin }, { dryRun: true });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
