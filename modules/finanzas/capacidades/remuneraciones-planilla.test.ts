import { beforeEach, describe, expect, it, vi } from "vitest";

const ejecutar = vi.fn();
vi.mock("@opai/capabilities", () => ({
  executeCapability: (...a: unknown[]) => ejecutar(...a),
  hoyChile: () => "2026-11-18",
}));

import { celdasRemuneraciones } from "./remuneraciones-planilla";
import { FILA_ANTICIPO, FILA_PREVIRED, FILA_SUELDOS } from "./filas-virtuales";
import type { Contexto } from "@opai/capabilities";

const ctx = {} as Contexto;
const semanas = ["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14"];
const ok = (items: unknown[], siguiente: string | null = null) => ({ ok: true, data: { items, siguiente, advertencias: [] } });

describe("celdasRemuneraciones (CAR-344)", () => {
  beforeEach(() => ejecutar.mockReset());

  it("pide la lectura de Nómina desde hoy hasta el fin de la última semana y arma una celda por fila y semana", async () => {
    ejecutar.mockResolvedValueOnce(
      ok([
        { fecha: "2026-11-30", concepto: "sueldos", monto: 9_000_000, personas: 20, estimado: true },
        { fecha: "2026-12-13", concepto: "previred", monto: 2_000_000, personas: 20, estimado: true },
        { fecha: "2026-12-15", concepto: "anticipo", monto: 1_000_000, personas: 18, estimado: true },
      ]),
    );
    const r = await celdasRemuneraciones(ctx, semanas);
    expect(ejecutar).toHaveBeenCalledWith(ctx, "nomina.costo_proyectado.listar", { desde: "2026-11-18", hasta: "2026-12-20", limite: 200 });
    expect(r.dominio).toEqual([
      { filaId: FILA_SUELDOS, semana: "2026-11-30", capa: "comprometido", monto: 9_000_000 },
      { filaId: FILA_PREVIRED, semana: "2026-12-07", capa: "comprometido", monto: 2_000_000 },
      { filaId: FILA_ANTICIPO, semana: "2026-12-14", capa: "comprometido", monto: 1_000_000 },
    ]);
    expect(r.vista[0]?.nota).toBe("Sueldos · se paga el 30-11-2026 · 20 personas · estimado desde los contratos");
  });

  it("recorre todas las páginas", async () => {
    ejecutar
      .mockResolvedValueOnce(ok([{ fecha: "2026-11-30", concepto: "sueldos", monto: 100, personas: 1, estimado: false }], "1"))
      .mockResolvedValueOnce(ok([{ fecha: "2026-12-01", concepto: "sueldos", monto: 50, personas: 1, estimado: false }]));
    const r = await celdasRemuneraciones(ctx, semanas);
    expect(ejecutar).toHaveBeenCalledTimes(2);
    expect(ejecutar.mock.calls[1]?.[2]).toMatchObject({ cursor: "1" });
    expect(r.dominio).toEqual([{ filaId: FILA_SUELDOS, semana: "2026-11-30", capa: "comprometido", monto: 150 }]);
    expect(r.vista[0]?.nota).toBe("Sueldos · se pagan el 30-11-2026, 01-12-2026 · 1 persona");
  });

  it("sin permiso o sin el módulo de Nómina, no hay filas de remuneraciones", async () => {
    ejecutar.mockResolvedValueOnce({ ok: false, error: { codigo: "FORBIDDEN", mensaje: "sin permiso" } });
    expect(await celdasRemuneraciones(ctx, semanas)).toEqual({ dominio: [], vista: [] });
  });

  it("una ventana solo de semanas pasadas no consulta Nómina", async () => {
    expect(await celdasRemuneraciones(ctx, ["2026-10-26", "2026-11-02"])).toEqual({ dominio: [], vista: [] });
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it("pide por tramos de hasta 5 meses cuando la ventana es más larga", async () => {
    ejecutar.mockResolvedValue(ok([]));
    const largas = Array.from({ length: 30 }, (_, i) => new Date(Date.parse("2026-11-16T00:00:00Z") + i * 7 * 86_400_000).toISOString().slice(0, 10));
    await celdasRemuneraciones(ctx, largas);
    const rangos = ejecutar.mock.calls.map((c) => [c[2].desde, c[2].hasta]);
    expect(rangos).toEqual([
      ["2026-11-18", "2027-04-17"],
      ["2027-04-18", "2027-06-13"],
    ]);
  });
});
