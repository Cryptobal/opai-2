import { PCT_ESCALA } from "@opai/domain/dinero";
import { aplicarMargen } from "./lineas";
import { CERO, N, UNO, sumar, type Numero } from "./numero";
import { agregarTraza } from "./resumen";
import type { LineaCalculada, Traza, VersionCalculo } from "./tipos";

export function margenDeSeccion(v: VersionCalculo, seccion: string): number {
  if (!v.margenesSeccion) return v.margenPct;
  const margen = v.margenesSeccion.find((s) => s.seccion === seccion);
  if (!margen) throw new Error("Falta margen de sección");
  return margen.margenPct;
}

/** Se suman bases con su margen sin redondear; instrumentos una vez por cotización. */
export function calcularBaseConMargen(v: VersionCalculo, lineas: readonly LineaCalculada[], adicionales: ReadonlySet<string>, traza: Traza[]): Numero {
  const configurados = v.margenesSeccion?.map((s) => s.seccion);
  if (configurados && new Set(configurados).size !== configurados.length) throw new Error("Margen de sección duplicado");
  if (configurados?.some((s) => !v.lineas.some((l) => l.seccion === s))) throw new Error("Sección de margen inexistente");
  const secciones = v.margenesSeccion ? [...new Set(v.lineas.filter((l) => l.habilitada).map((l) => l.seccion))] : [null];
  return sumar(secciones.map((seccion) => {
    const margenPct = seccion === null ? v.margenPct : margenDeSeccion(v, seccion);
    const ls = lineas.filter((l) => !adicionales.has(l.id) && (seccion === null || l.seccion === seccion));
    const c = N(ls.reduce((s, l) => s + l.costoMensual, 0));
    const mo = N(ls.filter((l) => ["mano_obra", "feriados"].includes(l.categoria)).reduce((s, l) => s + l.costoMensual, 0));
    const m = N(margenPct, PCT_ESCALA);
    if (m.comparar(CERO) < 0) throw new Error("Margen negativo");
    const base = m.comparar(UNO) >= 0 ? c : v.margenModo === "markup" ? c.por(UNO.mas(m))
      : v.margenModo === "margen_sobre_mano_de_obra" ? aplicarMargen(mo, margenPct).mas(c.menos(mo)) : aplicarMargen(c, margenPct);
    const formula = m.comparar(UNO) >= 0 ? "C (guarda m ≥ 100%)" : v.margenModo === "markup" ? "C × (1 + m)"
      : v.margenModo === "margen_sobre_mano_de_obra" ? "MO / (1 − m) + C − MO" : "C / (1 − m)";
    agregarTraza(traza, seccion === null ? "base" : `seccion:${seccion}`, "baseConMargen", formula,
      base.entero(), [["C", c.exacto()], ["MO", mo.exacto()], ["m", margenPct]], base.exacto());
    return base;
  }));
}
