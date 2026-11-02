// CAR-147 / CAR-143 · permiso de carga CAF: configure, no solo ventas.manage.
import { beforeAll, describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { capacidadesFinanzas } from "../src/finanzas";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";

const cargarCafInput = {
  tipoDte: 33 as const,
  folioDesde: 1,
  folioHasta: 100,
  cafVenceEn: "2026-12-31",
};

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
    const r = await executeCapability(ctx, "finanzas.folios.cargar_caf", cargarCafInput, { dryRun: true });
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

  it("rol con ventas.configure no recibe FORBIDDEN al cargar CAF (dryRun)", async () => {
    const { ctx } = contextoDePrueba({
      rol: null,
      permisosRol: ["finanzas:read", "finanzas:ventas.configure"],
      modulosActivos: ["finanzas"],
    });
    const r = await executeCapability(ctx, "finanzas.folios.cargar_caf", cargarCafInput, { dryRun: true });
    if (!r.ok) expect(r.error.code).not.toBe("FORBIDDEN");
  });
});
