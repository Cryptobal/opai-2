/** Cookie con el reto PKCE de la app (CAR-516), solo en el navegador del sistema y solo bajo `/app`. */
export const COOKIE_RETO_APP = "opai_app_reto";

/**
 * Precarga de Next u otro navegador sobre `/app/volver` (CAR-727 N1): no debe emitir el código ni
 * borrar la cookie antes del toque real.
 */
export function esPrecargaVueltaApp(cabeceras: Headers): boolean {
  if (cabeceras.get("next-router-prefetch") === "1") return true;
  const proposito = cabeceras.get("purpose") ?? cabeceras.get("sec-purpose") ?? "";
  return proposito.toLowerCase().includes("prefetch");
}

/** Enlace de vuelta a la app nativa «OPAI» (`cl.opai.app`, Brief 17). */
export const enlaceVueltaApp = (codigo: string): string =>
  `cl.opai.app://canje?codigo=${encodeURIComponent(codigo)}`;
