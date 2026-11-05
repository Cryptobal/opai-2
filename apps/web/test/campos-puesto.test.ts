import { describe, expect, it } from "vitest";

import { HORAS_SELECTOR, MINUTOS_SELECTOR } from "@opai/ds";

import { mismoPatron, opcionesPatron } from "@/app/(erp)/cotizaciones/[id]/_componentes/patron-opciones";

const patrones = [
  { id: "1", nombre: "4×4", resumen: "Ciclo de 8" },
  { id: "2", nombre: "6x1", resumen: "Ciclo de 7" },
];

describe("puesto de la cotización (CAR-192)", () => {
  it("el selector de hora ofrece horas 00–23 y minutos 00, 15, 30 y 45", () => {
    expect(HORAS_SELECTOR[0]).toBe("00");
    expect(HORAS_SELECTOR.at(-1)).toBe("23");
    expect(HORAS_SELECTOR).toHaveLength(24);
    expect([...MINUTOS_SELECTOR]).toEqual(["00", "15", "30", "45"]);
  });

  it("«4x4» guardado coincide con el patrón «4×4» de la empresa", () => {
    expect(mismoPatron("4x4", "4×4")).toBe(true);
    expect(mismoPatron("4x4", "7×7")).toBe(false);
  });

  it("las opciones son los patrones de la empresa; un valor ajeno se conserva", () => {
    expect(opcionesPatron(patrones, "4x4").map((o) => o.valor)).toEqual(["4×4", "6x1"]);
    const con = opcionesPatron(patrones, "Especial");
    expect(con.at(-1)).toMatchObject({ valor: "Especial", descripcion: "No está en Operaciones" });
    expect(opcionesPatron(patrones, "")).toHaveLength(2);
  });
});
