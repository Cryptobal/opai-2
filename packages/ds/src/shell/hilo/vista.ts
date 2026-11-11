/** Cómo se reparte el marco Hilo según la pantalla abierta (ADR-090). */
export type VistaHilo = "inicio" | "pantalla" | "ancha";

/**
 * `inicio`: el hilo abierto junto al lienzo. `pantalla`: una pantalla de trabajo; el hilo queda al
 * lado solo si el lienzo conserva su ancho (desde 1400 px), y si no, plegado en el riel. `ancha`: una
 * planilla; el hilo siempre plegado.
 */
export function vistaHilo(ruta: string, inicio: string, ancha: boolean): VistaHilo {
  if (ancha) return "ancha";
  return ruta === inicio ? "inicio" : "pantalla";
}

/**
 * Qué pieza se pinta en cada ancho. En teléfono y iPad vertical (menos de 1024 px) se ve una sola: el
 * hilo en Inicio —hasta que se abre el lienzo— y el lienzo en las demás pantallas. Las clases salen de
 * la ruta, que el servidor conoce: no hay salto al hidratar.
 */
export function clasesVista(vista: VistaHilo, lienzoAbierto: boolean) {
  return {
    hilo: {
      inicio: lienzoAbierto ? "hidden lg:flex" : "flex",
      pantalla: "hidden hilo:flex",
      ancha: "hidden",
    }[vista],
    riel: {
      inicio: "hidden",
      pantalla: "hidden lg:flex hilo:hidden",
      ancha: "hidden lg:flex",
    }[vista],
    lienzo: vista === "inicio" && !lienzoAbierto ? "hidden lg:flex" : "flex",
  };
}

/** El pendiente cuya pantalla está abierta en el lienzo se resalta; el inicio no cuenta como pantalla. */
export function pendienteAbierto(ruta: string, href: string, inicio: string): boolean {
  const base = href.split("?")[0] ?? href;
  if (base === inicio) return false;
  return ruta === base || ruta.startsWith(`${base}/`);
}
