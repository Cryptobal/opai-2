/**
 * Scroll tras una navegación del menú que mostró el esqueleto (CAR-231).
 *
 * Next sube la página al cambiar de ruta solo si el borde superior del contenido nuevo no está a la
 * vista. En una navegación lenta (> ESPERA_ESQUELETO_MS) el CSS oculta el contenido y muestra el
 * esqueleto, y Next decide el scroll mirando ese esqueleto —corto y ya visible—, así que no sube. Al
 * volver el contenido real, la lista queda en la posición de la página anterior (a mitad de la
 * página). Cuando el esqueleto estuvo visible y la ruta cambió, se vuelve arriba de forma explícita.
 */
export type VentanaScroll = { scrollTo(opciones: ScrollToOptions): void };

export function debeVolverArriba(p: { esqueletoVisible: boolean; inicio: string; actual: string }): boolean {
  return p.esqueletoVisible && p.inicio !== p.actual;
}

export function volverArribaSiCorresponde(
  ventana: VentanaScroll,
  p: { esqueletoVisible: boolean; inicio: string; actual: string },
): boolean {
  if (!debeVolverArriba(p)) return false;
  ventana.scrollTo({ top: 0, left: 0, behavior: "instant" });
  return true;
}
