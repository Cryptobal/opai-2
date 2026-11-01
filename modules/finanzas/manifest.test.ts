import { ajustesFinanzas } from "@opai/capabilities";
import { describe, expect, it } from "vitest";

import { manifest } from "./manifest";

// Condición del Revisor (#186/#182): un solo módulo `finanzas` con los permisos, la navegación, los
// eventos y las capacidades de Compras y de Flujo de caja, sin perder ni duplicar ninguno.
describe("manifest de Finanzas (Compras + Flujo de caja)", () => {
  it("reúne los permisos, la navegación y los eventos de los dos conjuntos", () => {
    expect(manifest.permisos.map((p) => p.id).sort()).toEqual([
      "finanzas:compras.manage",
      "finanzas:flujo.cerrar",
      "finanzas:flujo.configurar",
      "finanzas:flujo.gestionar",
      "finanzas:flujo.ver",
      "finanzas:plan.manage",
      "finanzas:proveedores.manage",
      "finanzas:read",
    ]);
    expect(manifest.navegacion.map((n) => n.href).sort()).toEqual([
      "/finanzas/compras",
      "/finanzas/flujo",
      "/finanzas/plan-de-cuentas",
    ]);
    expect(manifest.eventos).toHaveLength(16);
    expect(new Set(manifest.eventos.map((e) => e.id)).size).toBe(16);
    expect(manifest.configuracion).toBe(ajustesFinanzas);
  });

  it("tiene 25 capacidades con ids únicos", () => {
    const ids = manifest.capacidades.map((c) => c.id);
    expect(ids).toHaveLength(25);
    expect(new Set(ids).size).toBe(25);
  });
});
