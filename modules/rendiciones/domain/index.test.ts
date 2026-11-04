import { describe, expect, it } from "vitest";

import {
  claveDuplicado,
  codigoVisible,
  esEditable,
  esFechaFutura,
  itemsSinRespaldo,
  puedeDecidir,
  puedeTransitar,
  totalRendicion,
} from "./index";

describe("estados", () => {
  it("sigue el flujo borrador → enviada → decidida", () => {
    expect(puedeTransitar("borrador", "enviada")).toBe(true);
    expect(puedeTransitar("enviada", "aprobada")).toBe(true);
    expect(puedeTransitar("enviada", "devuelta")).toBe(true);
    expect(puedeTransitar("devuelta", "enviada")).toBe(true);
  });
  it("no se salta pasos ni sale de un estado final", () => {
    expect(puedeTransitar("borrador", "aprobada")).toBe(false);
    expect(puedeTransitar("rechazada", "enviada")).toBe(false);
    expect(puedeTransitar("anulada", "borrador")).toBe(false);
    expect(puedeTransitar("aprobada", "pagada")).toBe(true);
    expect(puedeTransitar("enviada", "pagada")).toBe(false);
  });
  it("solo borrador y devuelta se editan", () => {
    expect(["borrador", "devuelta"].every((e) => esEditable(e as never))).toBe(true);
    expect(["enviada", "aprobada", "rechazada", "pagada", "anulada"].some((e) => esEditable(e as never))).toBe(false);
  });
});

describe("cálculos y avisos", () => {
  it("suma en CLP entero", () => {
    expect(totalRendicion([{ monto: 1_500 }, { monto: 23_990 }])).toBe(25_490);
    expect(totalRendicion([])).toBe(0);
  });
  it("el código visible es REN-n", () => expect(codigoVisible(42)).toBe("REN-42"));
  it("la misma boleta con otra grafía es duplicada; sin folio no se compara", () => {
    const a = claveDuplicado({ proveedor: "Ferretería Ñandú ", folio: " 123 ", monto: 5_000 });
    expect(a).toBe(claveDuplicado({ proveedor: "ferreteria  nandu", folio: "123", monto: 5_000 }));
    expect(a).not.toBe(claveDuplicado({ proveedor: "Ferretería Ñandú", folio: "123", monto: 5_001 }));
    expect(claveDuplicado({ proveedor: "X", folio: "  ", monto: 1 })).toBeNull();
  });
  it("exige respaldo o motivo solo si la empresa lo pide", () => {
    const base = { fecha: "2026-11-01", proveedor: "P", descripcion: "d", monto: 1 };
    const items = [
      { ...base, tieneRespaldo: true },
      { ...base, tieneRespaldo: false },
      { ...base, tieneRespaldo: false, sinRespaldoMotivo: "Se perdió la boleta" },
    ];
    expect(itemsSinRespaldo(items, true)).toEqual([1]);
    expect(itemsSinRespaldo(items, false)).toEqual([]);
  });
  it("no admite fecha futura", () => {
    expect(esFechaFutura("2026-11-05", "2026-11-04")).toBe(true);
    expect(esFechaFutura("2026-11-04", "2026-11-04")).toBe(false);
  });
});

describe("quién decide", () => {
  it("solo el aprobador asignado, y nunca el solicitante", () => {
    expect(puedeDecidir("sol", "apr", "apr")).toBe(true);
    expect(puedeDecidir("sol", "otro", "apr")).toBe(false);
    expect(puedeDecidir("sol", "sol", "sol")).toBe(false);
    expect(puedeDecidir("sol", "apr", null)).toBe(false);
  });
});
