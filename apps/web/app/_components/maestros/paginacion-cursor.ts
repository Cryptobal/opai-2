import { estadoPantalla } from "@/lib/formato";
import { esUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";

export const POR_PAGINA = 50;

export const TAMANOS_PAGINA = [20, POR_PAGINA, 100] as const;
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

/** Conserva filtros al navegar; devuelve `?` si no hay parámetros (enlaces relativos en ficha). */
export function queryConCambios(p: Parametros, cambios: Record<string, string | null>) {
  const s = queryLista(p, cambios);
  return s || "?";
}