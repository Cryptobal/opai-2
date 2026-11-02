// CAR-143 · permiso de carga CAF (decisión Carlos 12:43 CLT): configure, no solo ventas.manage.
import { beforeAll, describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";
import { capacidadesFinanzas } from "../src/finanzas";

const xmlMin = "<CAF><DA><RE>76111222-8</RE><TD>33</TD><RNG><D>1</D><H>2</H></RNG><FA>2026-01-01</FA></DA></CAF>";

describe("Finanzas · folios.cargar_caf · permisos", () => {
  beforeAll(() => {
    limpiarRegistro();
    registrarCapacidades(capacidadesFinanzas);
  });

  it("solo ventas.manage recibe FORBIDDEN", async () => {
    const { ctx } = contextoDePrueba({
      rol: null,
      permisosRol: ["finanzas:read", "finanzas:ventas.manage"],
      modulosActivos: ["finanzas"],
    });
    const r = await executeCapability(ctx, "finanzas.folios.cargar_caf", { cafXml: xmlMin }, { dryRun: true });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
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
});
