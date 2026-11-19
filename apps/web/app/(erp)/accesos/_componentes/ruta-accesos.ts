import { conFiltros, type Parametros } from "@/lib/parametros";

/** Ruta con los filtros de Accesos (instalación y tipo, además de búsqueda y estado). */
export function rutaAccesos(
  base: string,
  p: Parametros,
  extra: Record<string, string> = {},
): string {
  const url = new URL(conFiltros(base, p), "http://x");
  for (const k of ["instalacion", "tipo", "motivo"] as const)
    if (p[k]) url.searchParams.set(k, p[k]);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.pathname + url.search;
}
