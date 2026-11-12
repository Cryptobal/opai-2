import { esUuid } from "@/lib/ids";
import { conBusqueda, type Parametros } from "@/lib/parametros";

/**
 * Consulta de la lista (`vista=lista`, búsqueda, estado y etapa): la ficha la conserva para que la
 * lista de la izquierda y «Atrás» vuelvan a la misma lista, no al tablero.
 */
export function consultaLista(p: Parametros) {
  // Ficha abierta desde el tablero: las demás filas recuerdan la misma columna, no la Lista.
  const columna = p["tablero"];
  if (p["vista"] !== "lista" && columna && esUuid(columna)) return `?tablero=${columna}`;
  const q = new URLSearchParams({ vista: "lista" });
  for (const k of ["q", "estado", "etapa", "etiqueta"]) if (p[k]) q.set(k, p[k]);
  return `?${q.toString()}`;
}

/** Descarga del Excel con la búsqueda, el estado, la etapa y la etiqueta de la pantalla (CAR-27). */
export function urlExportarNegocios(p: Parametros) {
  const q = new URLSearchParams();
  for (const k of ["q", "estado", "etapa", "etiqueta"]) if (p[k]) q.set(k, p[k]);
  const c = q.toString();
  return c ? `/api/negocios/export?${c}` : "/api/negocios/export";
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
