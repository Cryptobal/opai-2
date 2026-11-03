import { describe, expect, it } from "vitest";

import { resumenRecalculo } from "@/lib/cpq-recalculo";

describe("Recalcular informativo (CAR-162)", () => {
  it("de pendiente a calculado informa la venta", () => {
    const r = resumenRecalculo({ ventaMensual: null, noEnviable: true }, { ventaMensual: 1_250_000 });
    expect(r).toEqual({ tono: "exito", texto: "Costo calculado: venta mensual $1.250.000." });
  });

  it("si cambió la venta muestra antes y después", () => {
    expect(resumenRecalculo({ ventaMensual: 100 }, { ventaMensual: 200 }).texto).toBe("Venta mensual: $100 → $200.");
  });

  it("sin cambios dice qué falta", () => {
    const falta = {
      ventaMensual: null,
      noEnviable: true,
      avisos: [{ codigo: "sueldo_faltante", mensaje: "Falta el sueldo base de «Guardia».", lineaId: "l1" }],
    };
    const r = resumenRecalculo(falta, falta);
    expect(r.tono).toBe("info");
    expect(r.texto).toBe("Sin cambios: falta el sueldo base de «Guardia».");
  });

  it("sin cambios ni pendientes", () => {
    expect(resumenRecalculo({ ventaMensual: 5 }, { ventaMensual: 5 }).texto).toMatch(/^Sin cambios/);
  });
});
