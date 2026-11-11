import type { PortalHilo } from "@opai/ds";

import type { DatosShell } from "../tipos-shell";
import { QUIEN_PORTAL, tituloDeRuta } from "./datos-hilo";

/** Texto de la barra: con agente invita a pedir; sin agente, busca (ADR-090). */
export const barraHilo = (agente: boolean) =>
  agente
    ? ({ agente: true, texto: "Pide, pregunta o busca una pantalla" } as const)
    : ({ agente: false, texto: "Busca una pantalla o un registro" } as const);

/** Portales con la línea que dice para quién es cada uno. */
export const portalesHilo = (portales: DatosShell["portales"]): PortalHilo[] =>
  portales.map((p) => {
    const descripcion = QUIEN_PORTAL[p.id];
    return descripcion ? { ...p, descripcion } : p;
  });

/**
 * Título del lienzo. Con una navegación en curso nombra el destino de inmediato (ADR-045); mientras
 * la página no fija su cabecera (hasta que hidrata) usa la entrada del menú de la ruta, para que el
 * título no aparezca tarde.
 */
export function tituloLienzo(
  nav: DatosShell["nav"],
  ruta: string,
  pendiente: string | null,
  deLaPagina: string,
): string {
  if (ruta.startsWith("/configuracion")) return "Configuración";
  const destino = pendiente ? nav.find((n) => n.href === pendiente)?.etiqueta : undefined;
  return destino ?? (deLaPagina || tituloDeRuta(nav, ruta));
}
