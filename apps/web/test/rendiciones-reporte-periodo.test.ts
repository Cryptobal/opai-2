import { describe, expect, it } from "vitest";

import { etiquetaMes, filtrosDe, hrefExcel, mesActual, mesVecino, periodoDeMes } from "../app/_components/rendiciones/reporte/periodo";

describe("periodo del reporte", () => {
  it("lee mes y agrupación válidos, y cae al mes actual y persona si no", () => {
    const ahora = new Date("2026-11-14T08:00:00Z");
    expect(filtrosDe({ mes: "2026-10", por: "centro" }, ahora)).toEqual({ mes: "2026-10", agrupar: "centro" });
    expect(filtrosDe({ mes: "2026-13", por: "x" }, ahora)).toEqual({ mes: "2026-11", agrupar: "persona" });
    expect(mesActual(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11"); // aún 30 de noviembre en Chile
  });

  it("calcula los extremos del mes, el vecino y la etiqueta", () => {
    expect(periodoDeMes("2028-02")).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" });
    expect(mesVecino("2026-01", -1)).toBe("2025-12");
    expect(mesVecino("2026-12", 1)).toBe("2027-01");
    expect(etiquetaMes("2026-11")).toBe("Noviembre 2026");
    expect(hrefExcel("2026-10")).toBe("/api/rendiciones/reporte/excel?desde=2026-10-01&hasta=2026-10-31");
  });
});
