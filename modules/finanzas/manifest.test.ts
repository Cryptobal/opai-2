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
      "finanzas:ventas.configure",
      "finanzas:flujo.ver",
      "finanzas:flujo.gestionar",
      "finanzas:flujo.cerrar",
      "finanzas:flujo.configurar",
      "finanzas:bancos.ver",
      "finanzas:bancos.gestionar",
      "finanzas:bancos.autorizar",
    ]);
    // Configuración DTE, Folios y Plan de cuentas salieron del menú: van en Configuración (CAR-182).
    expect(manifest.navegacion.map((n) => n.href)).toEqual([
      "/finanzas/ventas",
      "/finanzas/compras",
      "/finanzas/bancos",
      "/finanzas/flujo",
    ]);
    expect(manifest.eventos).toHaveLength(38);
    expect(new Set(manifest.eventos.map((e) => e.id)).size).toBe(38);
    expect(manifest.configuracion).toBe(ajustesFinanzas);
  });

  it("tiene 65 capacidades con ids únicos", () => {
    const ids = manifest.capacidades.map((c) => c.id);
    expect(ids).toHaveLength(65);
    expect(new Set(ids).size).toBe(65);
  });
});
