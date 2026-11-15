import {
  conUnidad,
  type DefinicionPropio,
  type Hecho,
  mesCorto,
  type VistaPrevia,
} from "../../_componentes/tipos";

const numero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const UNIDAD_LEGIBLE: Record<string, string> = {
  cantidad: "cantidad",
  porcentaje: "%",
  horas: "horas",
  dias: "días",
  clp: "pesos",
  uf: "UF",
};

/** Unidad en que queda el indicador (y su meta), según cómo se calcula. */
export function unidadDe(d: DefinicionPropio | null, hechos: Hecho[]): string | null {
  if (!d) return null;
  if (d.forma === "contar") return "cantidad";
  if (d.forma === "porcentaje") return "porcentaje";
  if (d.forma === "tiempo") return d.unidad;
  return hechos.find((h) => h.id === d.hecho)?.montos.find((m) => m.id === d.monto)?.unidad ?? null;
}

export const unidadLegible = (u: string | null) => (u ? (UNIDAD_LEGIBLE[u] ?? u) : null);

/** Nombre de un monto para la persona: «valor_mensual» → «Valor mensual (pesos)». */
export function nombreMonto(id: string, unidad: string): string {
  const texto = id.replaceAll("_", " ");
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} (${unidadLegible(unidad)})`;
}

export function textoPrevia(v: VistaPrevia, unidad: string | null): string {
  const f = (n: number) => (unidad ? conUnidad(n, unidad) : numero.format(n));
  if (v.sujetos === 0) return `En ${mesCorto(v.periodo)} todavía no hay datos para este indicador.`;
  if (v.promedio === null || v.minimo === null || v.maximo === null) {
    return `En ${mesCorto(v.periodo)} hay datos de ${v.sujetos} persona(s): muy pocas para mostrar un resumen.`;
  }
  return `En ${mesCorto(v.periodo)}: ${v.sujetos} personas, promedio ${f(v.promedio)} (entre ${f(v.minimo)} y ${f(v.maximo)}).`;
}

/** Qué falta para poder guardar, en palabras; null si no falta nada. */
export function faltante(
  nombre: string,
  meta: number,
  unidad: string | null,
  d: DefinicionPropio | null,
): string | null {
  if (!d) return "Elige cómo se calcula y los hechos que usa.";
  if (nombre.trim().length < 3) return "Ponle un nombre de al menos 3 letras.";
  if (!(meta > 0)) return "Indica una meta sugerida mayor que cero.";
  if (unidad === "porcentaje" && meta > 100)
    return "La meta de un porcentaje no puede pasar de 100.";
  return null;
}
