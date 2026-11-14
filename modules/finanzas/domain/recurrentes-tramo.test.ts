import { describe, expect, it } from "vitest";

import type { Recurrente } from "./recurrentes";
import { cuotasQueCambian, diaAntes, partirEn } from "./recurrentes-tramo";

const arriendo: Recurrente = { frecuencia: "mensual", diaDelMes: 5, inicio: "2026-01-05", fin: null, repeticiones: null };

describe("gasto recurrente que cambia desde una fecha (CAR-413)", () => {
  it("cierra el tramo vigente el día antes y el nuevo empieza en la fecha", () => {
    const t = partirEn(arriendo, "2026-12-01", { frecuencia: "quincenal", diaDelMes: null });
    expect(t).toEqual({
      tipo: "partido",
      anterior: { ...arriendo, fin: "2026-11-30" },
      nuevo: { frecuencia: "quincenal", diaDelMes: null, inicio: "2026-12-01", fin: null, repeticiones: null },
    });
  });

  it("si aún no empieza, cambia el mismo gasto y mueve el inicio", () => {
    expect(partirEn(arriendo, "2025-12-20", { frecuencia: "mensual", diaDelMes: 10 })).toEqual({
      tipo: "en_lugar",
      nuevo: { ...arriendo, diaDelMes: 10, inicio: "2025-12-20" },
    });
  });

  it("reparte el tope de cuotas: el nuevo tramo lleva solo las que faltan", () => {
    const seis = { ...arriendo, repeticiones: 6 };
    const t = partirEn(seis, "2026-04-01", { frecuencia: "mensual", diaDelMes: 20 });
    expect(t).toMatchObject({ tipo: "partido", nuevo: { repeticiones: 3, inicio: "2026-04-01" } });
    expect(partirEn(seis, "2026-07-01", { frecuencia: "mensual", diaDelMes: 20 })).toEqual({ motivo: "Ese gasto ya no tiene cuotas desde esa fecha." });
  });

  it("no cambia un gasto que ya terminó", () => {
    expect(partirEn({ ...arriendo, fin: "2026-06-30" }, "2026-07-01", { frecuencia: "mensual", diaDelMes: 5 })).toEqual({ motivo: "El gasto ya terminó antes de esa fecha." });
  });

  it("la vista previa muestra las próximas cuotas antes y después", () => {
    const t = partirEn(arriendo, "2026-12-01", { frecuencia: "mensual", diaDelMes: 15 });
    if (!("tipo" in t)) throw new Error("sin tramos");
    const c = cuotasQueCambian(arriendo, t.nuevo, "2026-12-01");
    expect(c.antes.slice(0, 2)).toEqual(["2026-12-05", "2027-01-05"]);
    expect(c.despues.slice(0, 2)).toEqual(["2026-12-15", "2027-01-15"]);
    expect(c.antes).toHaveLength(12);
  });

  it("el día antes cruza meses y años", () => {
    expect(diaAntes("2027-01-01")).toBe("2026-12-31");
    expect(diaAntes("2028-03-01")).toBe("2028-02-29");
  });
});
