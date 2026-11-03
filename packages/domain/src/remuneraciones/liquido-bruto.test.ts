import { describe, expect, it } from "vitest";

import { UF_ESCALA } from "../dinero";
import { costoEmpleadorPorPersona } from "./costo-empresa";
import { liquidoABruto, TOPE_BRUTO_CLP } from "./liquido-bruto";
import { CASOS_CR, entradaReferencia, juegoReferencia } from "./referencia.fixture";

describe("líquido objetivo → sueldo base (CPQ v4, CampoSueldo)", async () => {
  const juego = await juegoReferencia();

  it("invierte los casos de referencia: el líquido del bruto vuelve al mismo bruto", () => {
    for (const c of CASOS_CR) {
      const e = entradaReferencia(c.base);
      const liquido = costoEmpleadorPorPersona(e, juego).liquidoEstimadoClp;
      const r = liquidoABruto(e, liquido, juego);
      expect(r.alcanzable).toBe(true);
      expect(r.liquidoClp).toBeGreaterThanOrEqual(liquido);
      // El menor base que alcanza el líquido: igual o hasta un peso menor por el redondeo legal.
      expect(c.base - r.sueldoBaseClp).toBeGreaterThanOrEqual(0);
      expect(c.base - r.sueldoBaseClp).toBeLessThanOrEqual(2);
    }
  });

  it("el bruto encontrado es el mínimo: un peso menos ya no alcanza el objetivo", () => {
    const e = entradaReferencia(553_553, 40_000, 30_000);
    const r = liquidoABruto(e, 600_000, juego);
    const menos = costoEmpleadorPorPersona({ ...e, sueldo: { ...e.sueldo, sueldoBaseClp: r.sueldoBaseClp - 1 } }, juego);
    expect(r.liquidoClp).toBeGreaterThanOrEqual(600_000);
    expect(menos.liquidoEstimadoClp).toBeLessThan(600_000);
    expect(r.diferenciaClp).toBe(r.liquidoClp - 600_000);
  });

  it("colación y movilización no imponibles bajan el bruto necesario peso por peso", () => {
    const sin = liquidoABruto(entradaReferencia(553_553, 0, 0), 650_000, juego);
    const con = liquidoABruto(entradaReferencia(553_553, 50_000, 0), 650_000, juego);
    expect(con.sueldoBaseClp).toBeLessThan(sin.sueldoBaseClp);
  });

  it("Isapre con plan sobre el 7 % exige más bruto que Fonasa para el mismo líquido", () => {
    const e = entradaReferencia(900_000);
    const fonasa = liquidoABruto(e, 800_000, juego);
    const isapre = liquidoABruto({ ...e, salud: { tipo: "isapre", planUf: 3 * UF_ESCALA } }, 800_000, juego);
    expect(isapre.sueldoBaseClp).toBeGreaterThan(fonasa.sueldoBaseClp);
  });

  it("objetivo 0 da base 0; objetivo inalcanzable lo dice sin lanzar", () => {
    expect(liquidoABruto(entradaReferencia(), 0, juego).sueldoBaseClp).toBe(0);
    const r = liquidoABruto(entradaReferencia(), 50_000_000, juego);
    expect(r).toMatchObject({ alcanzable: false, sueldoBaseClp: TOPE_BRUTO_CLP });
  });

  it("rechaza objetivos negativos o no enteros", () => {
    expect(() => liquidoABruto(entradaReferencia(), -1, juego)).toThrow(RangeError);
    expect(() => liquidoABruto(entradaReferencia(), 1.5, juego)).toThrow(RangeError);
  });
});
