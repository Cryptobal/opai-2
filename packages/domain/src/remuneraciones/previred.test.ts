import { describe, expect, it } from "vitest";

import { dentroDeBanda, leerPrevired, sonIguales, type Vigentes } from "./previred";
import { PAGINA_PREVIRED } from "./previred.fixture";
import { enteroChileno, porcentajeEscalado, textoPlano, ufEscalada } from "./previred-texto";

const VIGENTES: Vigentes = {
  topes: { pensionSaludUf: 900000, ipsUf: 600000, cesantiaUf: 1352000, indemnizacionUf: 900000 },
  afp: {
    obligatoria: 100000, salud: 70000,
    comisiones: { uno: 4600, modelo: 5800, planvital: 11600, habitat: 12700, capital: 14400, cuprum: 14400, provida: 14500 },
  },
};

describe("cifras chilenas", () => {
  it("convierte miles, porcentajes y UF a enteros escalados", () => {
    expect(enteroChileno("3.712.287")).toBe(3712287);
    expect(enteroChileno("3,7")).toBeNull();
    expect(porcentajeEscalado("11,44")).toBe(114400);
    expect(porcentajeEscalado("0,1")).toBe(1000);
    expect(porcentajeEscalado("3")).toBe(30000);
    expect(ufEscalada("135,2")).toBe(1352000);
    expect(ufEscalada("90")).toBe(900000);
  });
  it("decodifica entidades y quita scripts", () => {
    expect(textoPlano("<script>x()</script><b>Cesant&iacute;a</b>&nbsp;2,4%")).toBe("Cesantía 2,4%");
  });
});

describe("leerPrevired", () => {
  const { lectura, fallidos } = leerPrevired(PAGINA_PREVIRED, VIGENTES);
  it("lee los cinco indicadores y no deja fallidos", () => {
    expect(fallidos).toEqual([]);
    expect(lectura.imm).toBe(553553);
    expect(lectura.sis).toBe(17800);
    expect(lectura.cesantia).toEqual({ indefinidoEmpleador: 24000, indefinidoTrabajador: 6000, plazoFijoEmpleador: 30000 });
  });
  it("completa topes con lo que la página no publica (indemnización)", () => {
    expect(lectura.topes).toEqual({ pensionSaludUf: 900000, ipsUf: 600000, cesantiaUf: 1352000, indemnizacionUf: 900000 });
  });
  it("saca la comisión de cada AFP restando la cotización obligatoria", () => {
    expect(lectura.afp?.comisiones).toEqual(VIGENTES.afp?.comisiones);
    expect(lectura.afp?.obligatoria).toBe(100000);
  });
  it("coincide con el vigente: no hay cambio que proponer", () => {
    expect(sonIguales(lectura.afp, VIGENTES.afp)).toBe(true);
  });
  it("una página irreconocible deja todo como fallido, sin lanzar", () => {
    const r = leerPrevired("<html><body>Mantención</body></html>", VIGENTES);
    expect(r.lectura).toEqual({});
    expect(r.fallidos).toEqual(["imm", "topes", "afp", "sis", "cesantia"]);
  });
  it("sin vigente de topes o AFP no inventa: los marca fallidos", () => {
    expect(leerPrevired(PAGINA_PREVIRED, {}).fallidos).toEqual(["topes", "afp"]);
  });
  it("detecta un cambio de comisión", () => {
    const nueva = PAGINA_PREVIRED.replace("<td>Uno</td><td>10,46%", "<td>Uno</td><td>10,49%");
    expect(leerPrevired(nueva, VIGENTES).lectura.afp?.comisiones.uno).toBe(4900);
  });
});

describe("dentroDeBanda", () => {
  it("acepta el ajuste anual del ingreso mínimo y rechaza un salto absurdo", () => {
    expect(dentroDeBanda("imm", 553553, 570000)).toBe(true);
    expect(dentroDeBanda("imm", 553553, 5535530)).toBe(false);
  });
  it("rechaza estructuras de distinto largo", () => {
    expect(dentroDeBanda("topes", { a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});
