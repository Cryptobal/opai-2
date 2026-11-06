import { describe, expect, it } from "vitest";

import { proyectarResumenEconomico } from "./propuesta-tecnica";
import { repartirSeccionesComunes, totalesDocumento } from "./totales";

describe("totalesDocumento", () => {
  it("calcula IVA 19 % y total, y la propuesta usa la misma función", () => {
    const t = totalesDocumento(3_500_000);
    expect(t).toMatchObject({ netoClp: 3_500_000, ivaClp: 665_000, totalClp: 4_165_000 });
    const r = proyectarResumenEconomico({ apertura: "por_instalacion", secciones: [], netoTotalClp: 3_500_000 });
    expect([r.ivaClp, r.totalClp]).toEqual([t.ivaClp, t.totalClp]);
  });

  it("respeta la tasa del tenant y la base adicional", () => {
    expect(totalesDocumento(1_000_000, 100_000, 100_000).totalClp).toBe(1_210_000);
  });
});

describe("repartirSeccionesComunes", () => {
  it("la sección común no recibe dinero y las filas suman el neto", () => {
    const f = repartirSeccionesComunes([
      { nombre: "Planta A", tienePuestos: true, netoMensualClp: 1_000_001 },
      { nombre: "Planta B", tienePuestos: true, netoMensualClp: 2_000_000 },
      { nombre: "Común", tienePuestos: false, netoMensualClp: 333_333 },
    ]);
    expect(f.map((x) => x.nombre)).toEqual(["Planta A", "Planta B"]);
    expect(f.reduce((a, x) => a + x.netoMensualClp, 0)).toBe(3_333_334);
  });

  it("sin secciones con puestos no inventa filas", () => {
    expect(repartirSeccionesComunes([{ nombre: "Común", tienePuestos: false, netoMensualClp: 5 }])).toEqual([]);
  });
});
