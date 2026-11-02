import { describe, expect, it } from "vitest";
import { calcular } from "./calcular";
import { financieraPrueba, itemPrueba, modeloPrueba, parametrosPrueba, versionPrueba } from "./fixtures";
import { calcularInstrumentos } from "./instrumentos";
import { N, sumar } from "./numero";

function entrada(base = 8_000_000) {
  return { base: N(base), adicionales: N(0), unicos: N(0), instrumentos: financieraPrueba(),
    parametros: parametrosPrueba, mesesContrato: 12 };
}
const mensual = (e: ReturnType<typeof entrada>) => calcularInstrumentos(e).venta.entero();

describe("dorados financieros de 1.0 reexpresados con enteros escalados", () => {
  it("CD-1 y CD-2 al peso, advertencia y aprobación R34", () => {
    const v = versionPrueba([itemPrueba(10_000_000)]), i = financieraPrueba();
    i.financiero.habilitado = true; i.garantia.habilitada = true; v.instrumentos = i;
    expect(calcular(v, modeloPrueba(), parametrosPrueba)).toMatchObject({ ventaMensual: 10_279_605, advertencias: [] });
    i.garantia.habilitada = false; i.financiero.tasaPct = 350_000;
    expect(calcular(v, modeloPrueba(), parametrosPrueba)).toMatchObject({ ventaMensual: 13_500_000,
      advertencias: ["precio subvalorado"], requiereAprobacion: true });
  });
  it("sin instrumentos; financiero; garantía % sin/con administración", () => {
    const e = entrada(); expect(mensual(e)).toBe(8_000_000);
    e.instrumentos.financiero.habilitado = true; expect(mensual(e)).toBe(8_205_128);
    e.instrumentos.garantia.habilitada = true; e.instrumentos.garantia.administracionPct = 0;
    expect(mensual(e)).toBe(8_221_994);
    e.instrumentos.garantia.administracionPct = 2_000; expect(mensual(e)).toBe(8_223_684);
  });
  it("garantía fija: 100 UF × 40.845 × (2% + 0,2%) / 12", () => {
    const e = entrada(), g = e.instrumentos.garantia;
    g.habilitada = true; g.modo = "fija"; g.montoUf = 1_000_000;
    expect(mensual(e)).toBe(8_007_488);
    expect(calcularInstrumentos(e).garantizado.entero()).toBe(4_084_500);
  });
  it("RC prima 90 UF; RC tasa sobre 30.000 UF; asignación 25%; plazo sobrescrito R60", () => {
    const e = entrada(), rc = e.instrumentos.rc;
    rc.habilitada = true; rc.primaAnualUf = 900_000;
    expect(mensual(e)).toBe(8_306_338);
    rc.asignacionPct = 250_000; expect(calcularInstrumentos(e).responsabilidad.entero()).toBe(76_584);
    rc.asignacionPct = 1_000_000; rc.modo = "tasa"; rc.aseguradoUf = 300_000_000;
    expect(calcularInstrumentos(e).primaAnual.entero()).toBe(3_676_050);
    rc.plazo = "contrato"; e.mesesContrato = 24;
    expect(calcularInstrumentos(e).responsabilidad.entero()).toBe(153_169);
    rc.plazo = "meses"; rc.meses = 6;
    expect(calcularInstrumentos(e).responsabilidad.entero()).toBe(612_675);
  });
  it("guarda 40%, Mg 12 vs 24; manual histórico sobre base 9.000.000", () => {
    const e = entrada(); e.instrumentos.financiero = { habilitado: true, tasaPct: 400_000 };
    expect(mensual(e)).toBe(11_200_000);
    e.instrumentos.financiero.tasaPct = 25_000;
    const g = e.instrumentos.garantia; g.habilitada = true;
    const m12 = mensual(e); g.meses = 24; expect(mensual(e)).toBeGreaterThan(m12);
    g.meses = 12; g.contratoPct = 1_000_000; g.administracionPct = 0;
    expect(calcularInstrumentos({ ...e, baseFinancieraManual: 9_000_000 }).venta.entero()).toBe(8_405_000);
  });
  it("sin UF; únicos optativos en base % tanto manual como auto, nunca en fija", () => {
    const e = entrada(), g = e.instrumentos.garantia;
    e.instrumentos.rc.habilitada = true; e.instrumentos.rc.modo = "tasa";
    expect(calcularInstrumentos({ ...e, parametros: { ...parametrosPrueba, uf: null } })).toMatchObject({ faltaUf: true });
    e.instrumentos.rc.habilitada = false; e.unicos = N(1_000_000); g.habilitada = true;
    const sin = mensual(e); g.incluirUnicos = true;
    expect(mensual(e)).toBeGreaterThan(sin);
    expect(calcularInstrumentos({ ...e, baseFinancieraManual: 8_000_000 }).baseContrato.entero()).toBe(97_000_000);
    g.modo = "fija"; g.montoUf = 1_000_000;
    expect(calcularInstrumentos(e).incluyeUnicos).toBe(false);
  });
  it("adicionales mensuales entran al gross-up, únicos separados; reconstrucción acotada", () => {
    for (let n = 0; n < 40; n++) {
      const e = entrada(1_000_000 + n * 123_456), g = e.instrumentos.garantia;
      e.adicionales = N(n === 0 ? 500_000 : 0);
      e.instrumentos.financiero = { habilitado: true, tasaPct: (n % 10) * 3_000 };
      g.habilitada = true; g.contratoPct = (5 + n % 15) * 10_000;
      g.tasaAnualPct = 10_000 + (n % 3) * 5_000; g.administracionPct = (n % 5) * 1_000;
      g.meses = 12 + n % 2 * 12;
      e.instrumentos.rc.habilitada = n % 3 === 0;
      e.instrumentos.rc.primaAnualUf = (50 + n) * 10_000;
      const r = calcularInstrumentos(e);
      expect(sumar([e.base, e.adicionales, r.financiero, r.garantia, r.administracion, r.responsabilidad]).entero()).toBe(r.venta.entero());
    }
  });
});
