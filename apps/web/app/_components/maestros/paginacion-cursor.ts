import { esUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";

export const TAMANOS_PAGINA = [20, 50, 100] as const;
export type TamanoPagina = (typeof TAMANOS_PAGINA)[number];

const DEFECTO: TamanoPagina = 20;

/** `limite` y `cursor` de la URL para capacidades con paginación por cursor (CAR-585). */
export function entradaPaginaLista(p: Parametros) {
  return {
    limite: tamanoPagina(p),
    ...(p.cursor && esUuid(p.cursor) ? { cursor: p.cursor } : {}),
  };
}

/** Tamaño de página desde `?limite=` (20, 50 o 100). */
export function tamanoPagina(p: Parametros): TamanoPagina {
  const n = Number(p.limite);
  return TAMANOS_PAGINA.includes(n as TamanoPagina) ? (n as TamanoPagina) : DEFECTO;
}

/** Cursores ya recorridos (`?prev=a,b`) para «Anterior» en paginación por cursor. */
export function anterioresDe(p: Parametros) {
  return p.prev ? p.prev.split(",").filter(Boolean) : [];
}

/** Query string con parámetros de lista (conserva filtros; `null` borra la clave). */
export function queryLista(p: Parametros, cambios: Record<string, string | null> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}