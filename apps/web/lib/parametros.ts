/** searchParams de Next (promesa) → texto por clave (la primera si viene repetida). */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export type Parametros = Record<string, string | undefined>;

export async function leerParametros(sp: SearchParams): Promise<Parametros> {
  const p = await sp;
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

/** Query string con los parámetros vigentes y los cambios aplicados (null borra la clave). */
export function conCambios(p: Parametros, cambios: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "?";
}

/** Ruta con la búsqueda de la lista (`?q=`): abrir una ficha y volver no la pierde. */
export const conBusqueda = (ruta: string, q?: string) =>
  q ? `${ruta}?q=${encodeURIComponent(q)}` : ruta;

/** Filtros de una lista que sobreviven al abrir una ficha y al volver (`?q=`, `?estado=`, `?con=`, `?etiqueta=`). */
const FILTROS_DE_LISTA = [
  "q",
  "estado",
  "con",
  "etiqueta",
  "cursor",
  "persona",
  "instalacion",
  "centro",
  "desde",
  "hasta",
] as const;

/** Ruta con los filtros vigentes de la lista: abrir otra ficha no vuelve a «todos» ni pierde Cliente activo / Inactivo. */
export function conFiltros(ruta: string, p?: Parametros): string {
  const qs = new URLSearchParams();
  for (const k of FILTROS_DE_LISTA) {
    const v = p?.[k];
    if (v) qs.set(k, v);
  }
  const texto = qs.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}
