import type { ResultadoCalculo } from "./resultado";
import type { LineaCalculada, ModeloCosteo, Traza } from "./tipos";
import { N } from "./numero";

export function resumirLineas(lineas: LineaCalculada[], modelo: ModeloCosteo, traza: Traza[]) {
  const secciones = [...new Set(lineas.map((l) => l.seccion))].map((id) => ({ id,
    costoMensual: lineas.filter((l) => l.seccion === id).reduce((s, l) => s + l.costoMensual, 0),
    costoUnico: lineas.filter((l) => l.seccion === id).reduce((s, l) => s + l.costoUnico, 0) }));
  const categorias = modelo.categorias.map((c) => ({ id: c.id, clase: c.clase,
    costoMensual: lineas.filter((l) => l.categoria === c.id).reduce((s, l) => s + l.costoMensual, 0) }));
  const subtotal = (clase: "directo" | "indirecto") => categorias.filter((c) => c.clase === clase).reduce((s, c) => s + c.costoMensual, 0);
  for (const s of secciones) for (const campo of ["costoMensual", "costoUnico"] as const)
    agregarTraza(traza, `seccion:${s.id}`, campo, "suma de líneas", s[campo],
      lineas.filter((l) => l.seccion === s.id).map((l) => [l.id, l[campo]]));
  for (const c of categorias) agregarTraza(traza, `categoria:${c.id}`, "costoMensual", "suma de líneas", c.costoMensual,
    lineas.filter((l) => l.categoria === c.id).map((l) => [l.id, l.costoMensual]));
  return { secciones, categorias, directos: subtotal("directo"), indirectos: subtotal("indirecto") };
}
export function agregarTraza(traza: Traza[], item: string, monto: string, formula: string, valor: number,
  variables: readonly (readonly [string, number | string])[], exacto = N(valor).exacto()): void {
  traza.push({ item, monto, formula, valor, exacto,
    variables: variables.map(([clave, valor]) => ({ clave, valor, ambito: "cotizacion" })) });
}
export function trazarTotales(r: ResultadoCalculo): void {
  for (const campo of ["directos", "indirectos", "costoMensual", "costoUnico", "pagosUnicos"] as const) {
    const ls = r.lineas.filter((l) => campo === "directos" || campo === "indirectos"
      ? r.categorias.some((c) => c.id === l.categoria && c.clase === (campo === "directos" ? "directo" : "indirecto")) : true);
    const origen = campo === "costoUnico" ? "costoUnico" : campo === "pagosUnicos" ? "ventaUnica" : "costoMensual";
    agregarTraza(r.traza, "totales", campo, "suma de líneas", r[campo], ls.map((l) => [l.id, l[origen]]));
  }
}
