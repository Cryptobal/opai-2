import { describe, expect, it } from "vitest";

import { UF_ESCALA } from "../dinero";
import { cantidadEscalada, montoLineaProgramacion, montosProgramacion, motivoNoActivable } from "./programacion-montos";
import { validarMontosVenta } from "./ventas";

const clp = (precio: number, cantidad = "1", descuentoPct = 0, exento = false) => ({
  glosa: "Servicio",
  cantidad,
  precioUnitarioClp: BigInt(precio),
  precioUnitarioUf: null,
  descuentoPct,
  exento,
});
const uf = (ufTexto: number, cantidad = "1", descuentoPct = 0) => ({
  glosa: "Servicio UF",
  cantidad,
  precioUnitarioClp: null,
  precioUnitarioUf: BigInt(Math.round(ufTexto * UF_ESCALA)),
  descuentoPct,
  exento: false,
});

describe("programación · montos exactos", () => {
  it("cantidad decimal sin float", () => {
    expect(cantidadEscalada("0.5")).toBe(5000n);
    expect(cantidadEscalada("2,0000")).toBe(20000n);
    expect(cantidadEscalada("12")).toBe(120000n);
    expect(() => cantidadEscalada("-1")).toThrow();
  });

  it("CLP: cantidad 0,5 y descuento", () => {
    expect(montoLineaProgramacion(clp(1001, "0.5"), null)).toBe(501);
    expect(montoLineaProgramacion(clp(100_000, "1", 1550), null)).toBe(84_500);
    expect(montoLineaProgramacion(clp(100_000, "1", 10_000), null)).toBe(0);
  });

  it("UF 12,5 × 2 con 10 % de descuento y UF de 39.123,45", () => {
    // 12,5 × 2 × 0,9 = 22,5 UF × 39.123,45 = 880.277,625 → 880.278
    expect(montoLineaProgramacion(uf(12.5, "2", 1000), 3_912_345n)).toBe(880_278);
  });

  it("UF sin valor lanza", () => {
    expect(() => montoLineaProgramacion(uf(1), null)).toThrow(/UF/);
  });

  it("montos de la 33 cuadran con validarMontosVenta", () => {
    const r = montosProgramacion(33, [clp(100_000), uf(2, "1")], 3_912_345n);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.montos.neto).toBe(100_000 + 78_247);
    expect(validarMontosVenta(33, r.montos)).toBeNull();
  });

  it("la 34 va exenta y cuadra", () => {
    const r = montosProgramacion(34, [clp(50_000, "1", 0, true), clp(10_000)], null);
    expect(r.ok && r.montos).toMatchObject({ neto: 0, iva: 0, exento: 60_000, total: 60_000 });
    if (r.ok) expect(validarMontosVenta(34, r.montos)).toBeNull();
  });

  it("33 con línea exenta, tipos 56/61, sin líneas y descuento total no generan", () => {
    expect(montosProgramacion(33, [clp(1, "1", 0, true)], null)).toMatchObject({ ok: false, motivo: /afecta/ });
    expect(montosProgramacion(61, [clp(1)], null)).toMatchObject({ ok: false });
    expect(montosProgramacion(33, [], null)).toMatchObject({ ok: false, motivo: /no tiene líneas/ });
    expect(montosProgramacion(33, [clp(100, "1", 10_000)], null)).toMatchObject({ ok: false, motivo: /monto/ });
  });

  it("descuento total en una línea la omite del borrador", () => {
    const r = montosProgramacion(33, [clp(100, "1", 10_000), clp(1000)], null);
    expect(r.ok && r.lineas).toEqual([{ glosa: "Servicio", monto: 1000, cantidad: "1", precioUnitario: 1000, descuentoPct: 0 }]);
  });

  it("las líneas calculadas conservan cantidad, precio y descuento para imprimirlos", () => {
    const r = montosProgramacion(33, [clp(500_000, "2,5", 1000)], null);
    expect(r.ok && r.lineas[0]).toMatchObject({ cantidad: "2.5", precioUnitario: 500_000, descuentoPct: 1000 });
  });

  it("activación: cuenta, líneas y tipo", () => {
    expect(motivoNoActivable({ tipoDte: 33, cuentaId: null, lineas: [{ exento: false }] })).toBe("Asigna la cuenta del cliente.");
    expect(motivoNoActivable({ tipoDte: 33, cuentaId: "c", lineas: [] })).toMatch(/líneas/);
    expect(motivoNoActivable({ tipoDte: 56, cuentaId: "c", lineas: [{ exento: false }] })).toMatch(/pausada/);
    expect(motivoNoActivable({ tipoDte: 34, cuentaId: "c", lineas: [{ exento: true }] })).toBeNull();
  });
});
