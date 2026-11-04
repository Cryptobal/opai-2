import { describe, expect, it } from "vitest";

import { partesDeResumen } from "@/app/(erp)/_componentes/aprobaciones-pendientes";

describe("tarjetas de aprobaciones pendientes (CAR-162)", () => {
  it("separa tipo, código y cliente del resumen", () => {
    expect(partesDeResumen("Margen · CPQ-2026-002 · TEST QA Empresa")).toEqual({
      tipo: "Margen",
      titulo: "CPQ-2026-002",
      detalle: "TEST QA Empresa",
    });
  });
  it("sin el formato esperado deja todo como título", () => {
    expect(partesDeResumen("Revisar acceso del agente")).toEqual({
      tipo: null,
      titulo: "Revisar acceso del agente",
      detalle: null,
    });
  });
});
