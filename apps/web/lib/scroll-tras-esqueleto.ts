/**
 * Scroll tras una navegación del menú que mostró el esqueleto (CAR-231). Next sube la página solo si
 * el borde del contenido nuevo no está a la vista; con el esqueleto (> ESPERA_ESQUELETO_MS) decide
 * midiendo ese esqueleto, ya visible, y no sube: la lista queda a mitad de página. Si el esqueleto
 * estuvo visible y la ruta cambió, se vuelve arriba aquí.
 */
export const subirTrasEsqueleto = (
  w: { scrollTo(o: ScrollToOptions): void },
  visible: boolean,
  inicio: string,
  actual: string,
): boolean => visible && inicio !== actual && (w.scrollTo({ top: 0, behavior: "instant" }), true);
