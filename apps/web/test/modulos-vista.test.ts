import { describe, expect, it } from "vitest";

import { agruparModulosPorArea } from "../app/(platform)/platform/tenants/[id]/modulos-vista";

describe("agruparModulosPorArea", () => {
  it("mantiene el complemento junto al módulo padre", () => {
    const grupos = agruparModulosPorArea([
      {
        id: "nomina",
        nombre: "Remuneraciones",
        version: "0.1",
        dependencias: [],
        estado: "activo",
        complemento: false,
        padreId: null,
        area: "personas",
        etiquetaCobro: null,
      },
      {
        id: "nomina.cumplimiento_dt",
        nombre: "Cumplimiento DT",
        version: "",
        dependencias: ["nomina"],
        estado: null,
        complemento: true,
        padreId: "nomina",
        area: "personas",
        etiquetaCobro: "Pagado",
      },
    ]);
    expect(grupos[0]?.titulo).toBe("Personas");
    expect(grupos[0]?.filas.map((f) => f.id)).toEqual(["nomina", "nomina.cumplimiento_dt"]);
  });
});