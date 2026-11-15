import type { Parametros } from "@/lib/parametros";

/** Filtros del libro de compras que viajan en la URL; abrir un documento y volver no los pierde (CAR-256). */
const CLAVES = ["periodo", "sin_centro", "q"] as const;

/** Ruta con los filtros vigentes del libro (`periodo`, `sin_centro`, `q`). */
export function conFiltrosCompras(ruta: string, p: Parametros): string {
  const q = new URLSearchParams();
  for (const k of CLAVES) {
    const v = p[k];
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `${ruta}?${s}` : ruta;
}
