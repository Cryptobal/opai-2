import { describe, expect, it } from "vitest";

import {
  aClp,
  cargoDelMes,
  type CondicionCobro,
  limitesDelPeriodo,
  ufDesdeTexto,
} from "./cargo-modulo";

const base: CondicionCobro = {
  moneda: "CLP",
  precioMensual: 300_000,
  cobroDesde: "2026-01-01",
  pruebaHasta: null,
  descuentoPct: 0,
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

describe("cargoDelMes", () => {
  it("cobra el mes completo cuando el cobro empezó antes", () => {
    expect(cargoDelMes(base, "activo", "2026-10")).toMatchObject({
      facturable: true,
      motivo: "factura",
      desde: "2026-10-01",
      diasCobrados: 31,
      monto: 300_000,
    });
  });

  it("prorratea el primer mes por días, con redondeo mitad hacia arriba", () => {
    const r = cargoDelMes({ ...base, cobroDesde: "2026-11-16" }, "activo", "2026-11");
    expect(r).toMatchObject({ desde: "2026-11-16", diasCobrados: 15, diasMes: 30, monto: 150_000 });
    const impar = cargoDelMes(
      { ...base, precioMensual: 100_001, cobroDesde: "2026-11-16" },
      "activo",
      "2026-11",
    );
    expect(impar.monto).toBe(50_001); // 50.000,5 → 50.001
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

  it("en prueba sin fecha de fin no factura; con prueba vencida factura desde el día siguiente", () => {
    expect(cargoDelMes({ ...base, pruebaHasta: null }, "trial", "2026-10").motivo).toBe(
      "en_prueba",
    );
    const r = cargoDelMes({ ...base, pruebaHasta: "2026-10-20" }, "trial", "2026-10");
    expect(r).toMatchObject({ facturable: true, desde: "2026-10-21", diasCobrados: 11 });
    expect(cargoDelMes({ ...base, pruebaHasta: "2026-10-31" }, "trial", "2026-10").motivo).toBe(
      "en_prueba",
    );
  });

  it("sin inicio explícito parte al terminar la prueba; sin ninguno de los dos no parte", () => {
    const r = cargoDelMes(
      { ...base, cobroDesde: null, pruebaHasta: "2026-09-30" },
      "activo",
      "2026-10",
    );
    expect(r).toMatchObject({ facturable: true, diasCobrados: 31 });
    expect(cargoDelMes({ ...base, cobroDesde: null }, "activo", "2026-10").motivo).toBe(
      "sin_inicio",
    );
  });

  it("un cobro que empieza el mes siguiente no factura", () => {
    expect(cargoDelMes({ ...base, cobroDesde: "2026-11-01" }, "activo", "2026-10").motivo).toBe(
      "cobro_futuro",
    );
  });

  it("precio 0 o descuento total queda como bonificado", () => {
    expect(cargoDelMes({ ...base, precioMensual: 0 }, "activo", "2026-10").motivo).toBe(
      "bonificado",
    );
    expect(cargoDelMes({ ...base, descuentoPct: 1_000_000 }, "activo", "2026-10").facturable).toBe(
      false,
    );
  });

  it("calcula en UF escalada", () => {
    const r = cargoDelMes({ ...base, moneda: "UF", precioMensual: 25_000 }, "activo", "2026-10");
    expect(r.monto).toBe(25_000); // 2,5 UF
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
