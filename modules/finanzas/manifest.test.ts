import { ajustesFinanzas } from "@opai/capabilities";
import { describe, expect, it } from "vitest";

import { manifest } from "./manifest";

// Condición del Revisor (#186/#182): un solo módulo `finanzas` con los permisos, la navegación, los
// eventos y las capacidades de Compras, Flujo de caja y Ventas DTE, sin perder ni duplicar ninguno.
describe("manifest de Finanzas (Compras + Flujo + Ventas DTE)", () => {
  it("reúne los permisos, la navegación y los eventos de los tres conjuntos", () => {
    expect(manifest.permisos.map((p) => p.id)).toEqual([
      "finanzas:read",
      "finanzas:compras.manage",
      "finanzas:proveedores.manage",
      "finanzas:plan.manage",
      "finanzas:ventas.manage",
      "finanzas:flujo.ver",
      "finanzas:flujo.gestionar",
      "finanzas:flujo.cerrar",
      "finanzas:flujo.configurar",
    ]);
    expect(manifest.navegacion.map((n) => n.href)).toEqual([
      "/finanzas/ventas",
      "/finanzas/compras",
      "/finanzas/plan-de-cuentas",
      "/finanzas/flujo",
    ]);
    expect(manifest.eventos).toHaveLength(26);
    expect(new Set(manifest.eventos.map((e) => e.id)).size).toBe(26);
    expect(manifest.configuracion).toBe(ajustesFinanzas);
  });

  it("tiene 44 capacidades con ids únicos", () => {
    const ids = manifest.capacidades.map((c) => c.id);
    expect(ids).toHaveLength(44);
    expect(new Set(ids).size).toBe(44);
  });
});
