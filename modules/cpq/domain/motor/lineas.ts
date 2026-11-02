import { UF_ESCALA, PCT_ESCALA } from "@opai/domain/dinero";
import { evaluarFormula } from "./formulas";
import { CERO, N, UNO, type Numero } from "./numero";
import type { LineaCalculada, LineaItem, ModeloCosteo, ParametrosCalculo, Traza, VersionCalculo } from "./tipos";

export function aplicarMargen(costo: Numero, margenPct: number): Numero {
  const m = N(margenPct, PCT_ESCALA);
  return m.comparar(UNO) >= 0 ? costo : costo.div(UNO.menos(m));
}
export function calcularItem(
  l: LineaItem, v: VersionCalculo, modelo: ModeloCosteo, parametros: ParametrosCalculo,
  personas: Numero, posiciones: number, traza: Traza[], advertencias: string[],
): LineaCalculada {
  if (!modelo.categorias.some((c) => c.id === l.item.categoria)) throw new Error(`Categoría rota: ${l.item.categoria}`);
  if (l.item.categoria === "feriados") throw new Error("Feriados se calcula desde puestos");
  const precio = l.costoUnitario ?? l.item.costoUnitario;
  let unitario = N(precio);
  if (l.item.moneda === "UF") {
    if (!parametros.uf || parametros.uf.fecha !== parametros.fecha || parametros.uf.valorClpEscalado <= 0) { advertencias.push("falta valor UF"); unitario = CERO; }
    else unitario = N(precio, UF_ESCALA).por(N(parametros.uf.valorClpEscalado, UF_ESCALA));
  }
  const rateo = l.rateo ?? l.item.rateo;
  const variables = [{ clave: "precio", ambito: "linea" as const, valor: precio },
    { clave: "cantidad", ambito: "linea" as const, valor: l.cantidadEscalada },
    { clave: "rateo", ambito: l.rateo ? "linea" as const : "modelo" as const, valor: JSON.stringify(rateo) }];
  let formula = "precio × cantidad", monto = unitario.por(N(l.cantidadEscalada, 10_000));
  if (l.item.moneda === "UF") {
    formula = "precioUF / escalaUF × valorUF / escalaUF × cantidad / escalaCantidad";
  }
  if (l.item.modo === "por_persona_mes") { monto = monto.por(personas); formula += " × personas"; }
  if (l.item.modo === "por_puesto_mes") { monto = monto.por(N(posiciones)); formula += " × posiciones"; }
  const usadas: Traza["variables"][number][] = [...variables,
    ...(l.item.moneda === "UF" ? [
      { clave: "UF", ambito: "parametro" as const, valor: parametros.uf?.valorClpEscalado ?? 0 },
      { clave: "escalaUF", ambito: "parametro" as const, valor: UF_ESCALA },
      { clave: "escalaCantidad", ambito: "parametro" as const, valor: 10_000 },
      { clave: "fechaUF", ambito: "parametro" as const, valor: parametros.uf?.fecha ?? "" },
    ] : []),
    { clave: "alcanceDotacion", ambito: "linea", valor: l.alcanceDotacion ?? "cotizacion" },
    { clave: "personas", ambito: "cotizacion", valor: personas.exacto() },
    { clave: "posiciones", ambito: "cotizacion", valor: posiciones }];
  if (l.item.modo === "formula") {
    if (!l.item.formula) throw new Error(`Falta fórmula del ítem: ${l.item.id}`);
    if (l.item.moneda === "UF") throw new Error("Fórmulas monetarias deben expresarse en CLP");
    const r = evaluarFormula(l.item.formula, modelo, v.variables,
      { precio, cantidad: l.cantidadEscalada, personas: personas.por(N(10_000)).entero(), posiciones, ...l.variables });
    if (r.unidad !== "clp") throw new Error(`Fórmula de costo debe dar CLP: ${l.item.id}`);
    monto = r.valor; formula = l.item.formula; usadas.push(...r.variables);
  }
  const unico = l.item.modo === "inversion" && rateo.tipo === "unico";
  if (l.item.modo === "inversion" && rateo.tipo !== "unico") {
    const meses = rateo.tipo === "contrato" ? v.meses : rateo.meses;
    monto = monto.div(N(meses)); formula += " / meses";
    usadas.push({ clave: "meses", ambito: "cotizacion", valor: meses });
    if (meses > v.meses) advertencias.push("rateo mayor que plazo del contrato");
  }
  if (monto.comparar(CERO) < 0) throw new Error("El costo no puede ser negativo");
  const costo = monto.entero();
  const venta = aplicarMargen(N(costo), l.tipo === "adicional" ? l.margenPct : v.margenPct).entero();
  traza.push({ item: l.id, monto: unico ? "costoUnico" : "costoMensual", formula, variables: usadas, valor: costo, exacto: monto.exacto() });
  if (unico || l.tipo === "adicional") traza.push({ item: l.id, monto: unico ? "ventaUnica" : "ventaAdicional",
    formula: "costo / (1 − margen)", variables: [{ clave: "costo", ambito: "linea", valor: costo },
      { clave: "margenPct", ambito: "linea", valor: l.tipo === "adicional" ? l.margenPct : v.margenPct }], valor: venta, exacto: aplicarMargen(N(costo), l.tipo === "adicional" ? l.margenPct : v.margenPct).exacto() });
  return { id: l.id, seccion: l.seccion, categoria: l.item.categoria, costoMensual: unico ? 0 : costo,
    costoUnico: unico ? costo : 0, ventaAdicional: !unico && l.tipo === "adicional" ? venta : 0, ventaUnica: unico ? venta : 0 };
}
