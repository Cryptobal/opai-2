import { describe, expect, it } from "vitest";
import { costoEmpleadorPorPersona } from "./costo-empresa";
import { referencia10 } from "./legado.fixture";
import { CASOS_GC, CASOS_CR, entradaReferencia, juegoReferencia } from "./referencia.fixture";

const ESPERADOS_GC = [
  [871_022, 606_146, -7_649], [831_022, 566_146, -2_651], [1_271_022, 1_006_146, -57_633],
  [436_153, 322_634, -11_132], [1_344_332, 915_660, -4_013], [1_465_598, 996_542, -3_231],
] as const;
const ESPERADOS_CR = [
  [1_050_875, 715_925], [1_125_938, 767_062], [1_404_965, 956_570],
  [1_708_132, 1_153_637], [975_813, 664_787], [975_813, 664_787],
] as const;

describe("CA9: casos dorados con diferencias de regla explícitas", async () => {
  const juego = await juegoReferencia();
  for (const [i, c] of CASOS_GC.entries()) {
    it(`${c.caso}: reproduce 1.0; 2.0 cambia provisiones y redondeo por concepto, impuesto en UTM`, () => {
      const viejo = referencia10(c.base, c.colacion, c.movilizacion);
      expect([viejo.costo, viejo.liquido]).toEqual([c.costo, c.liquido]);
      const r = costoEmpleadorPorPersona(entradaReferencia(c.base, c.colacion, c.movilizacion), juego);
      const esperado = ESPERADOS_GC[i]!;
      expect([r.costoEmpresaMensualClp, r.liquidoEstimadoClp]).toEqual(esperado.slice(0, 2));
      expect(r.costoEmpresaMensualClp - viejo.costo).toBe(esperado[2]);
      expect(r.desglose.vacacionesClp).toBe(Math.round(c.base / 30 * 21 / 12));
      expect(r.desglose.indemnizacionClp).toBe(Math.round(r.desglose.haberes.imponible / 12));
      expect(r.traza.find((t) => t.concepto === "Impuesto único")?.valorClp).toBe(i === 5 ? 938 : 0);
      expect(r.traza.map((t) => t.paso)).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 7]));
    });
  }
  for (const [i, c] of CASOS_CR.entries()) {
    it(`${c.caso}, base ${c.base}: reproduce costo y líquido 1.0 y explica nueva provisión/UTM`, () => {
      const viejo = referencia10(c.base);
      expect([viejo.costo, viejo.liquido]).toEqual([c.costo, c.liquido]);
      const r = costoEmpleadorPorPersona(entradaReferencia(c.base), juego);
      expect([r.costoEmpresaMensualClp, r.liquidoEstimadoClp]).toEqual(ESPERADOS_CR[i]);
    });
  }
  it("CA10: colación, movilización y aportes no aumentan las provisiones", () => {
    const entradas = [entradaReferencia(), entradaReferencia(553_553, 220_000, 220_000),
      { ...entradaReferencia(), mutualAdicional: 30_000 }];
    const resultados = entradas.map((e) => costoEmpleadorPorPersona(e, juego));
    expect(resultados.map((r) => r.desglose.vacacionesClp)).toEqual([32_291, 32_291, 32_291]);
    expect(resultados.map((r) => r.desglose.indemnizacionClp)).toEqual([57_662, 57_662, 57_662]);
    expect(resultados[1]!.costoEmpresaMensualClp - resultados[0]!.costoEmpresaMensualClp).toBe(440_000);
  });
  it("semilla 71: costo entero, determinista y monótono también sobre los topes", () => {
    let semilla = 71;
    const bases = Array.from({ length: 500 }, () => {
      semilla = (Math.imul(semilla, 1_664_525) + 1_013_904_223) >>> 0;
      return 1 + semilla % 20_000_000;
    }).sort((a, b) => a - b);
    let anterior = 0;
    for (const base of bases) {
      const entrada = entradaReferencia(base);
      const r = costoEmpleadorPorPersona(entrada, juego);
      expect(r).toEqual(costoEmpleadorPorPersona(entrada, juego));
      expect(Number.isSafeInteger(r.costoEmpresaMensualClp)).toBe(true);
      expect(Number.isSafeInteger(r.liquidoEstimadoClp)).toBe(true);
      expect(r.costoEmpresaMensualClp).toBeGreaterThanOrEqual(anterior);
      anterior = r.costoEmpresaMensualClp;
    }
  });
});
