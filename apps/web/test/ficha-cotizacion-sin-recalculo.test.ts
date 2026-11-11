import { beforeEach, describe, expect, it, vi } from "vitest";

const llamadas: string[] = [];
let meta: Record<string, unknown> = {};

vi.mock("@/lib/cpq-ui", () => ({
  accesoCpq: () => ({ leer: true, crear: true, aprobar: false, aprobarEnvios: false, confirmarPuestos: false, costos: true }),
}));
vi.mock("@/lib/servidor", () => ({
  identidadActual: async () => ({}),
  ejecutarComoUsuario: async (_portal: string, id: string) => {
    llamadas.push(id);
    if (id === "cpq.cotizaciones.ficha") {
      return {
        ok: true,
        data: {
          cotizacion: { id: "c", codigo: "COT-1", titulo: "t", negocioId: "n", vigente: true },
          negocioTitulo: null,
          cuentaId: null,
          meta,
          calculo: {},
          version: { id: "v", editable: true, estado: "borrador", validaHasta: null, numero: 1 },
          secciones: [],
        },
      };
    }
    return { ok: true, data: { versiones: [] } };
  },
}));

beforeEach(() => {
  llamadas.length = 0;
});

describe("abrir la ficha de una cotización solo lee (CAR-231)", () => {
  it.each([
    ["con el cálculo al día", { avisoRecalculo: null }],
    ["con valores legales desactualizados", { avisoRecalculo: { mensaje: "x" } }],
    ["sin meta", {}],
  ])("no ejecuta ningún recálculo %s", async (_nombre, m) => {
    meta = m;
    const { cargarFichaCotizacion } = await import("@/app/(erp)/cotizaciones/_componentes/datos");
    const r = await cargarFichaCotizacion("c");
    expect(r.state).toBe("ready");
    expect(llamadas).not.toContain("cpq.cotizaciones.calcular");
    expect(llamadas.filter((c) => c === "cpq.cotizaciones.ficha")).toHaveLength(1);
  });
});
