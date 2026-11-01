import { PCT_ESCALA, UF_ESCALA } from "@opai/domain/dinero";
import { CERO, N, UNO, sumar, type Numero } from "./numero";
import type { Instrumentos, ParametrosCalculo } from "./tipos";

export type EntradaFinanciera = {
  base: Numero; adicionales: Numero; unicos: Numero; instrumentos: Instrumentos;
  parametros: ParametrosCalculo; mesesContrato: number;
  /** Compatibilidad del modo financiero manual de 1.0 (difiere de precioManualClp, R36). */
  baseFinancieraManual?: number;
  /** R36: fija S; no aplica gross-up ni suma de nuevo los instrumentos. */
  precioManualClp?: number;
};
export function calcularInstrumentos(e: EntradaFinanciera) {
  const { financiero: f, garantia: g, rc } = e.instrumentos;
  const pct = (n: number) => N(n, PCT_ESCALA);
  const tasa = f.habilitado ? pct(f.tasaPct) : CERO;
  const p = g.habilitada ? pct(g.contratoPct) : CERO;
  const r = g.habilitada ? pct(g.tasaAnualPct) : CERO;
  const a = g.habilitada ? pct(g.administracionPct) : CERO;
  const uf = e.parametros.uf && e.parametros.uf.fecha === e.parametros.fecha ? N(e.parametros.uf.valorClpEscalado, UF_ESCALA) : CERO;
  const necesitaUf = (g.habilitada && g.modo === "fija") || rc.habilitada;
  const faltaUf = necesitaUf && uf.comparar(CERO) <= 0;
  const enClp = (monto: number) => N(monto, UF_ESCALA).por(uf);
  const plazoRc = rc.plazo === "anual" ? 12 : rc.plazo === "contrato" ? e.mesesContrato : rc.meses;
  const primaAnual = rc.habilitada && !faltaUf
    ? rc.modo === "prima" ? enClp(rc.primaAnualUf) : enClp(rc.aseguradoUf).por(pct(rc.tasaAnualPct)) : CERO;
  const responsabilidad = primaAnual.por(pct(rc.asignacionPct)).div(N(plazoRc));
  const fija = g.habilitada && g.modo === "fija" && !faltaUf ? enClp(g.montoUf) : CERO;
  const primaFija = fija.por(r).div(N(12)), adminFija = fija.por(a).div(N(g.meses));
  const unico = g.habilitada && g.modo === "porcentaje" && g.incluirUnicos ? e.unicos : CERO;
  const coeficiente = g.habilitada && g.modo === "porcentaje" ? p.por(N(g.meses).por(r).div(N(12)).mas(a)) : CERO;
  const k = tasa.mas(coeficiente), subvalorado = k.comparar(N(350_000, PCT_ESCALA)) >= 0;
  const costoUnicos = unico.por(p).por(r.div(N(12)).mas(a.div(N(g.meses))));
  const base = e.base.mas(e.adicionales);
  const numerador = sumar([base, responsabilidad, primaFija, adminFija, costoUnicos]);
  const manual = e.baseFinancieraManual !== undefined;
  const baseManual = N(e.baseFinancieraManual || e.base.entero());
  let venta = e.precioManualClp !== undefined ? N(e.precioManualClp) : manual ? baseManual
    : subvalorado ? numerador.por(UNO.mas(k)) : numerador.div(UNO.menos(k));
  function detalle(s: Numero) {
    const baseContrato = g.habilitada && g.modo === "porcentaje" ? s.por(N(g.meses)).mas(unico) : CERO;
    const garantizado = g.modo === "fija" ? fija : baseContrato.por(p);
    return { financiero: s.por(tasa), garantia: g.modo === "fija" ? primaFija : garantizado.por(r).div(N(12)),
      administracion: g.modo === "fija" ? adminFija : garantizado.por(a).div(N(g.meses)),
      responsabilidad, garantizado, baseContrato, primaAnual };
  }
  const instrumentos = detalle(venta);
  if (manual && e.precioManualClp === undefined)
    venta = sumar([base, instrumentos.financiero, instrumentos.garantia, instrumentos.administracion, responsabilidad]);
  // TODO(decisión Carlos): R66, corredor: prima mínima, emisión y meses extra. Solo R33 histórico.
  return { venta, ...instrumentos, k, faltaUf, subvalorado, fijo: primaFija.mas(adminFija), costoUnicos,
    grossUp: !manual && e.precioManualClp === undefined && !subvalorado && k.comparar(CERO) > 0,
    incluyeUnicos: unico.comparar(CERO) > 0 };
}
