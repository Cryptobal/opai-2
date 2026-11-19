/** Cookie con el reto PKCE de la app (CAR-516), solo en el navegador del sistema y solo bajo `/app`. */
export const COOKIE_RETO_APP = "opai_app_reto";

/** Enlace de vuelta a la app nativa «OPAI» (`cl.opai.app`, Brief 17). */
export const enlaceVueltaApp = (codigo: string): string =>
  `cl.opai.app://canje?codigo=${encodeURIComponent(codigo)}`;
