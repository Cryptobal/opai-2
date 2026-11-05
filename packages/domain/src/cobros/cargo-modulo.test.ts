import { describe, expect, it } from "vitest";

import { aClp, cargoDelMes, ufDesdeTexto } from "./cargo-modulo";
import { type CondicionCobro, limitesDelPeriodo } from "./catalogo";

const base: CondicionCobro = {
  moneda: "CLP",
  forma: "fijo",
  unidad: null,
  precio: 300_000,
  minimoMensual: null,
  cobroDesde: "2026-01-01",
  pruebaHasta: null,
  pasaACobro: false,
  descuentoPct: 0,
};
const porUnidad: CondicionCobro = {
  ...base,
  moneda: "UF",
  forma: "por_unidad",
  unidad: "trabajador_activo",
  precio: 1_000, // 0,1 UF por trabajador
  minimoMensual: 50_000, // 5 UF
};

describe("limitesDelPeriodo", () => {
  it("da el primer y último día y los días del mes, con años bisiestos", () => {
    expect(limitesDelPeriodo("2026-02")).toEqual({
      inicio: "2026-02-01",
      fin: "2026-02-28",
      dias: 28,
    });
    expect(limitesDelPeriodo("2028-02").dias).toBe(29);
    expect(() => limitesDelPeriodo("2026-13")).toThrow(RangeError);
  });
});

describe("cargoDelMes · precio fijo", () => {
  it("cobra el mes completo cuando el cobro empezó antes", () => {
    expect(cargoDelMes(base, "activo", "2026-10")).toMatchObject({
      facturable: true,
      desde: "2026-10-01",
      diasCobrados: 31,
      cantidad: null,
      monto: 300_000,
    });
  });

  it("prorratea el primer mes por días, con redondeo mitad hacia arriba", () => {
    const r = cargoDelMes({ ...base, cobroDesde: "2026-11-16" }, "activo", "2026-11");
    expect(r).toMatchObject({ desde: "2026-11-16", diasCobrados: 15, diasMes: 30, monto: 150_000 });
    const impar = { ...base, precio: 100_001, cobroDesde: "2026-11-16" };
    expect(cargoDelMes(impar, "activo", "2026-11").monto).toBe(50_001); // 50.000,5 → 50.001
  });

  it("aplica el descuento sobre el bruto", () => {
    const r = cargoDelMes({ ...base, descuentoPct: 100_000 }, "activo", "2026-10");
    expect(r).toMatchObject({ bruto: 300_000, descuento: 30_000, monto: 270_000 });
  });

  it("no factura un módulo suspendido o no contratado, ni sin condición", () => {
    expect(cargoDelMes(base, "suspendido", "2026-10").motivo).toBe("modulo_inactivo");
    expect(cargoDelMes(base, null, "2026-10").motivo).toBe("modulo_inactivo");
    expect(cargoDelMes(null, "activo", "2026-10").motivo).toBe("sin_condicion");
  });

  it("un cobro que empieza el mes siguiente no factura; precio 0 queda como bonificado", () => {
    const futuro = { ...base, cobroDesde: "2026-11-01" };
    expect(cargoDelMes(futuro, "activo", "2026-10").motivo).toBe("cobro_futuro");
    expect(cargoDelMes({ ...base, precio: 0 }, "activo", "2026-10").motivo).toBe("bonificado");
  });
});

describe("cargoDelMes · pruebas (adenda ADR-071)", () => {
  const prueba = { ...base, cobroDesde: null, pruebaHasta: "2026-10-20" };
  it("en prueba no factura; al vencer con «pasa a cobro» factura desde el día siguiente", () => {
    expect(cargoDelMes({ ...prueba, pruebaHasta: "2026-10-31" }, "trial", "2026-10").motivo).toBe(
      "en_prueba",
    );
    const r = cargoDelMes({ ...prueba, pasaACobro: true }, "trial", "2026-10");
    expect(r).toMatchObject({ facturable: true, desde: "2026-10-21", diasCobrados: 11 });
  });

  it("sin «pasa a cobro» la prueba vencida no factura (solo lectura)", () => {
    expect(cargoDelMes(prueba, "trial", "2026-10").motivo).toBe("prueba_vencida");
    expect(cargoDelMes(prueba, "trial", "2026-12").motivo).toBe("prueba_vencida");
  });

  it("un inicio explícito manda, pero nunca antes de que termine la prueba", () => {
    const r = cargoDelMes({ ...prueba, cobroDesde: "2026-10-01" }, "activo", "2026-10");
    expect(r).toMatchObject({ desde: "2026-10-21", diasCobrados: 11 });
  });
});

describe("cargoDelMes · por unidad", () => {
  it("cobra cantidad × precio y guarda la cantidad", () => {
    const r = cargoDelMes(porUnidad, "activo", "2026-10", 80);
    expect(r).toMatchObject({ facturable: true, cantidad: 80, mensual: 80_000, monto: 80_000 });
  });

  it("aplica el mínimo y después el descuento", () => {
    const r = cargoDelMes({ ...porUnidad, descuentoPct: 100_000 }, "activo", "2026-10", 10);
    expect(r).toMatchObject({ cantidad: 10, mensual: 50_000, descuento: 5_000, monto: 45_000 });
  });

  it("sin cantidad contada no factura; con cero y sin mínimo queda bonificado", () => {
    expect(cargoDelMes(porUnidad, "activo", "2026-10").motivo).toBe("sin_cantidad");
    const sinMinimo = { ...porUnidad, minimoMensual: null };
    expect(cargoDelMes(sinMinimo, "activo", "2026-10", 0)).toMatchObject({
      motivo: "bonificado",
      cantidad: 0,
    });
  });
});

describe("aClp y ufDesdeTexto", () => {
  it("convierte UF con la UF en centavos de CLP, redondeando al peso", () => {
    expect(aClp(25_000, "UF", 3_912_345)).toBe(97_809); // 2,5 × 39.123,45 = 97.808,625
    expect(aClp(25_000, "UF", null)).toBeNull();
    expect(aClp(120_000, "CLP", null)).toBe(120_000);
  });

  it("lee UF escrita con coma o punto y hasta 4 decimales", () => {
    expect(ufDesdeTexto("2,5")).toBe(25_000);
    expect(ufDesdeTexto("12.3456")).toBe(123_456);
    expect(ufDesdeTexto("1,23456")).toBeNull();
    expect(ufDesdeTexto("-1")).toBeNull();
  });
});
