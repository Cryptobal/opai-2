import { esUuid } from "@/lib/ids";
import { conBusqueda, type Parametros } from "@/lib/parametros";

/**
 * Consulta de la lista (`vista=lista`, búsqueda, estado y etapa): la ficha la conserva para que la
 * lista de la izquierda y «Atrás» vuelvan a la misma lista, no al tablero.
 */
export function consultaLista(p: Parametros) {
  const q = new URLSearchParams({ vista: "lista" });
  for (const k of ["q", "estado", "etapa"]) if (p[k]) q.set(k, p[k]);
  return `?${q.toString()}`;
}

/** Ficha abierta desde una tarjeta del tablero: recuerda su columna (`?tablero=<etapaId>`). */
export const fichaDesdeTablero = (negocioId: string, etapaId: string) =>
  `/negocios/${negocioId}?tablero=${etapaId}`;

/** «Atrás» de la ficha (CAR-33): a la lista con sus filtros, o al tablero en la columna de origen. */
export function volverANegocios(p: Parametros) {
  if (p["vista"] === "lista") return `/negocios${consultaLista(p)}`;
  const etapa = p["tablero"];
  if (etapa && esUuid(etapa)) return `/negocios?etapa=${etapa}`;
  return conBusqueda("/negocios", p["q"]);
}
