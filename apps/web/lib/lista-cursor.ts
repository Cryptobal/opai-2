import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";

export const POR_PAGINA = 50;

/** `limite` y `cursor` de la URL para capacidades con paginación por cursor (CAR-353 / CAR-624). */
export function consultaListaCursor(p: Parametros) {
  return {
    limite: POR_PAGINA,
    ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
  };
}

type PaginaLista<T> = { items: T[]; siguiente: string | null; total?: number };

/** Respuesta de capacidad paginada → estado de pantalla + filas y cursores. */
export function itemsPaginaDe<T>(r: { ok: boolean; data?: PaginaLista<T> }) {
  const data = r.ok ? r.data : undefined;
  return {
    state: estadoPantalla(r),
    items: data?.items ?? [],
    siguiente: data?.siguiente ?? null,
    total: data?.total ?? null,
  };
}