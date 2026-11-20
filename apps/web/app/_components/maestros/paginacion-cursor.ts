import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";

export const POR_PAGINA = 50;

type ResultadoPagina<T> = {
  ok: boolean;
  error?: { code: string };
  data?: { items: T[]; siguiente: string | null };
};

/** Campos comunes de una lista paginada por cursor tras `ejecutarComoUsuario`. */
export function vistaPaginaCursor<T>(r: ResultadoPagina<T>) {
  return {
    state: estadoPantalla(r),
    items: r.ok && r.data ? r.data.items : [],
    siguiente: r.ok && r.data ? r.data.siguiente : null,
  };
}

/** Cursores ya recorridos (`?prev=`) para volver con «Anterior». */
export const anteriores = (p: Parametros) => (p["prev"] ? p["prev"].split(",") : []);

/** Query string con cambios (null borra la clave). */
export function queryConCambios(p: Parametros, cambios: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "?";
}