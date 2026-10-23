/** searchParams de Next (promesa) → texto por clave (la primera si viene repetida). */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export type Parametros = Record<string, string | undefined>;

export async function leerParametros(sp: SearchParams): Promise<Parametros> {
  const p = await sp;
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
