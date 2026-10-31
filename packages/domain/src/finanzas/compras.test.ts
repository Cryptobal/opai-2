import { describe, expect, it } from "vitest";

import { sugerirCentroCosto, vistaPreviaAsignacion } from "./centro-costo";
import {
  diasParaReclamo,
  finDePeriodo,
  periodoDe,
  signoDte,
  validarMontos,
  venceReclamo,
  vencimientoPago,
} from "./compras";

describe("sugerirCentroCosto", () => {
  it("prefiere el centro del proveedor a la última compra", () => {
    expect(sugerirCentroCosto({ centroProveedor: "cc-p", centroUltimaCompra: "cc-u" })).toEqual({
      centroCostoId: "cc-p",
      origen: "proveedor",
    });
  });

  it("cae a la última compra del proveedor", () => {
    expect(sugerirCentroCosto({ centroProveedor: null, centroUltimaCompra: "cc-u" })).toEqual({
      centroCostoId: "cc-u",
      origen: "ultima_compra",
    });
  });

  it("no inventa nada sin antecedentes", () => {
    expect(sugerirCentroCosto({ centroProveedor: null, centroUltimaCompra: null })).toBeNull();
  });
});

describe("vistaPreviaAsignacion", () => {
  const filas = [
    { id: "a", centroCostoId: null },
    { id: "b", centroCostoId: "cc-1" },
    { id: "c", centroCostoId: "cc-2" },
  ];

  it("por defecto solo asigna a las que no tienen centro", () => {
    expect(vistaPreviaAsignacion(filas, "cc-1", false)).toEqual({
      aplican: ["a"],
      sinCambio: ["b"],
      conOtroCentro: ["c"],
    });
  });

  it("con sobrescribir cambia también las que tienen otro centro", () => {
    expect(vistaPreviaAsignacion(filas, "cc-1", true)).toEqual({
      aplican: ["a", "c"],
      sinCambio: ["b"],
      conOtroCentro: [],
    });
  });
});

describe("validarMontos", () => {
  const ok = { neto: 100_000, exento: 0, iva: 19_000, otrosImpuestos: 0, total: 119_000 };

  it("acepta un documento cuadrado", () => {
    expect(validarMontos(ok)).toBeNull();
  });

  it("rechaza un total que no cuadra", () => {
    expect(validarMontos({ ...ok, total: 120_000 })).toMatch(/no cuadra/);
  });

  it("rechaza decimales, negativos y montos fuera de rango", () => {
    expect(validarMontos({ ...ok, neto: 100_000.5 })).toMatch(/enteros/);
    expect(validarMontos({ ...ok, exento: -1 })).toMatch(/enteros/);
    expect(validarMontos({ ...ok, total: 2_500_000_000 })).toMatch(/enteros/);
  });
});

describe("plazos y períodos", () => {
  it("la nota de crédito resta; los demás suman", () => {
    expect([33, 34, 56, 61].map((t) => signoDte(t as 33))).toEqual([1, 1, 1, -1]);
  });

  it("el plazo para reclamar son 8 días corridos desde la recepción", () => {
    expect(venceReclamo("2026-10-25")).toBe("2026-11-02");
    expect(diasParaReclamo("2026-10-25", "2026-10-30")).toBe(3);
    expect(diasParaReclamo("2026-10-25", "2026-11-04")).toBe(-2);
  });

  it("calcula el período y su fin, también en diciembre", () => {
    expect(periodoDe("2026-10-30")).toBe("2026-10");
    expect(finDePeriodo("2026-10")).toBe("2026-11-01");
    expect(finDePeriodo("2026-12")).toBe("2027-01-01");
  });

  it("el vencimiento de pago suma el plazo del proveedor", () => {
    expect(vencimientoPago("2026-10-20", 30)).toBe("2026-11-19");
  });
});
