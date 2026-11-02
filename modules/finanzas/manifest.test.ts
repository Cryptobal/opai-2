import { ajustesFinanzas } from "@opai/capabilities";
import { describe, expect, it } from "vitest";

import { manifest } from "./manifest";

describe("manifest de Finanzas (Compras + Flujo + Ventas DTE)", () => {
  it("reúne permisos, navegación y eventos sin duplicados", () => {
    const permisos = manifest.permisos.map((p) => p.id);
    expect(permisos).toContain("finanzas:ventas.manage");
    expect(new Set(permisos).size).toBe(permisos.length);
    expect(manifest.navegacion.map((n) => n.href)).toContain("/finanzas/ventas");
    expect(new Set(manifest.eventos.map((e) => e.id)).size).toBe(manifest.eventos.length);
    expect(manifest.configuracion).toBe(ajustesFinanzas);
  });

  it("tiene capacidades con ids únicos", () => {
    const ids = manifest.capacidades.map((c) => c.id);
    expect(ids.length).toBeGreaterThanOrEqual(38);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
