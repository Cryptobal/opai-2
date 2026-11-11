import type { Parametros } from "@/lib/parametros";

/** Filtros del Libro que viajan en la URL; abrir una factura y volver a la lista no los pierde (CAR-255). */
const CLAVES = ["periodo", "estado", "q"] as const;

/** Ruta con los filtros vigentes del Libro (`periodo`, `estado`, `q`) y, si se pide, `editar=1`. */
export function conFiltros(ruta: string, p: Parametros, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  for (const k of CLAVES) {
    const v = p[k];
    if (v) q.set(k, v);
  }
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  const s = q.toString();
  return s ? `${ruta}?${s}` : ruta;
}
