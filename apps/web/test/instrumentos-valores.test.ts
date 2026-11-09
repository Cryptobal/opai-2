import { describe, expect, it } from "vitest";

import { aEscalado, aTexto, erroresValores, type InstrumentosCompletos, parcialInstrumentos, valoresIniciales } from "@/lib/instrumentos-valores";

const base: InstrumentosCompletos = {
  financiero: { habilitado: true, tasaPct: 12_000 },
  garantia: { habilitada: true, modo: "porcentaje", meses: 24, contratoPct: 100_000, tasaAnualPct: 18_000, administracionPct: 5_000, montoUf: 0, incluirUnicos: false },
  rc: { habilitada: true, modo: "prima", primaAnualUf: 125_000, aseguradoUf: 0, tasaAnualPct: 0, asignacionPct: 1_000_000, plazo: "contrato", meses: 12 },
};

describe("valores de instrumentos", () => {
  it("convierte entre texto y escala sin float", () => {
    expect(aTexto(12_000, "tasaPct")).toBe("1,2");
    expect(aTexto(125_000, "primaAnualUf")).toBe("12,5");
    expect(aEscalado("1,2", "tasaPct")).toBe(12_000);
    expect(aEscalado("12.5", "primaAnualUf")).toBe(125_000);
    expect(aEscalado("abc", "tasaPct")).toBeNull();
    expect(aEscalado("101", "tasaPct")).toBeNull();
    expect(aEscalado("0", "meses")).toBeNull();
    expect(aEscalado("24", "meses")).toBe(24);
  });
  it("sin cambios no manda nada y con cambios manda solo lo editado", () => {
    const v = valoresIniciales(base);
    expect(parcialInstrumentos(v, v)).toEqual({});
    const editado = { ...v, garantia: { ...v.garantia, tasaAnualPct: "2,4" }, rcPlazo: "anual" as const };
    expect(parcialInstrumentos(v, editado)).toEqual({ garantia: { tasaAnualPct: 24_000 }, rc: { plazo: "anual" } });
  });
  it("marca los valores inválidos solo de los campos que aplican al modo", () => {
    const v = valoresIniciales(base);
    expect(Object.keys(erroresValores(v))).toHaveLength(0);
    const malo = { ...v, financiero: { tasaPct: "x" }, garantia: { ...v.garantia, montoUf: "zzz" } };
    expect(Object.keys(erroresValores(malo))).toEqual(["financiero.tasaPct"]);
    expect(Object.keys(erroresValores({ ...malo, garantiaModo: "fija" }))).toContain("garantia.montoUf");
  });
});
