import { describe, expect, it } from "vitest";

import { propuestaFiniquito } from "./finiquito";

describe("propuestaFiniquito", () => {
  it("arma líneas básicas con sueldo y años de servicio", () => {
    const p = propuestaFiniquito(
      {
        vinculoId: "v1",
        personaId: "p1",
        inicio: "2022-01-01",
        termino: "2026-09-15",
        motivoTermino: "necesidades de la empresa",
        sueldoBase: 500_000,
        diasTrabajadosMes: 15,
      },
      "2026-09-20",
    );
    expect(p.aniosServicio).toBe(4);
    expect(p.lineas.some((l) => l.id === "indemnizacion_anios")).toBe(true);
    expect(p.total).toBeGreaterThan(500_000);
    expect(p.plazoPagoHasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.lineas.some((l) => l.id === "feriado_proporcional")).toBe(true);
  });

  it("resta vacaciones tomadas del feriado", () => {
    const p = propuestaFiniquito(
      {
        vinculoId: "v3",
        personaId: "p3",
        inicio: "2022-01-01",
        termino: "2026-09-15",
        motivoTermino: null,
        sueldoBase: 500_000,
        diasTrabajadosMes: 15,
        diasVacacionesTomados: 20,
      },
      "2026-09-20",
    );
    const feriado = p.lineas.find((l) => l.id === "feriado_proporcional");
    expect(feriado?.origen).toContain("20 tomados");
  });

  it("avisa sin sueldo base", () => {
    const p = propuestaFiniquito(
      {
        vinculoId: "v2",
        personaId: "p2",
        inicio: "2025-01-01",
        termino: "2026-01-31",
        motivoTermino: null,
        sueldoBase: null,
        diasTrabajadosMes: null,
      },
      "2026-02-01",
    );
    expect(p.lineas.length).toBe(0);
    expect(p.avisos.some((a) => a.includes("sueldo"))).toBe(true);
  });
});