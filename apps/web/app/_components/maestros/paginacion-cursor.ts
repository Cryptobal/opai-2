import type { Parametros } from "@/lib/parametros";

export const POR_PAGINA = 50;

/** Cursores ya recorridos (`?prev=`) para volver con «Anterior». */
export const anteriores = (p: Parametros) => (p["prev"] ? p["prev"].split(",") : []);

/** Query string con cambios (null borra la clave). */
export function queryConCambios(p: Parametros, cambios: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "?";
}