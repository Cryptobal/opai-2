import { describe, expect, it } from "vitest";

import { armarIndicadores, type Indicadores } from "@/app/(erp)/_componentes/indicadores-armar";

const vacio: Indicadores = {
  cobertura: null,
  negocios: null,
  cotizacionesPorAprobar: null,
  facturado: null,
  tickets: null,
};

describe("armarIndicadores", () => {
  it("omite lo que viene en null", () => {
    expect(armarIndicadores(vacio, 10_000)).toEqual([]);
  });
  it("cobertura sin turnos no muestra porcentaje inventado", () => {
    const [c] = armarIndicadores(
      {
        ...vacio,
        cobertura: { fecha: "2026-11-03", programados: 0, cubiertos: 0, ppc: 0, cobertura: null },
      },
      10_000,
    );
    expect(c?.valor).toBe("—");
    expect(c?.variacion?.texto).toBe("Sin turnos hoy");
  });
  it("negocios en UF y cotizaciones por aprobar; sin UF cae a CLP", () => {
    const base = { cantidad: 2, valorMensualClp: 1_000_000, valorMensualUf: 25_000_000 };
    const [uf] = armarIndicadores({ ...vacio, negocios: base, cotizacionesPorAprobar: 1 }, 10_000);
    expect(uf?.valor).toContain("UF");
    expect(uf?.variacion?.texto).toContain("1 cotización por aprobar");
    const [clp] = armarIndicadores(
      { ...vacio, negocios: { ...base, valorMensualUf: null } },
      10_000,
    );
    expect(clp?.valor).toContain("$");
  });
  it("facturado compara contra el mismo corte; sin base lo dice", () => {
    const f = { periodo: "2026-11", hastaDia: 3, netoClp: 150, netoMesAnteriorClp: 100 };
    expect(armarIndicadores({ ...vacio, facturado: f }, 10_000)[0]?.variacion).toMatchObject({
      tono: "success",
    });
    const sin = armarIndicadores(
      { ...vacio, facturado: { ...f, netoMesAnteriorClp: 0 } },
      10_000,
    )[0];
    expect(sin?.variacion?.texto).toBe("Sin base del mes anterior");
  });
  it("tickets sin ver_todos no muestra el total", () => {
    const [k] = armarIndicadores(
      { ...vacio, tickets: { abiertos: null, asignadosAMi: 3 } },
      10_000,
    );
    expect(k?.variacion).toBeUndefined();
  });
});
