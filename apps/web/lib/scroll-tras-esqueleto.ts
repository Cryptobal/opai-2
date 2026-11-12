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

type Desplazable = { scrollTo(o: ScrollToOptions): void };

/** Selector del contenido desplazable del lienzo en el marco Hilo (`data-lienzo` en `LienzoHilo`). */
export const SELECTOR_LIENZO = "main[data-lienzo]";

/**
 * Qué se desplaza: en el marco Hilo, el lienzo (la ventana no se mueve); en el clásico, la ventana
 * (CAR-317).
 */
export const contenedorDeScroll = (
  buscarLienzo: () => Desplazable | null,
  ventana: Desplazable,
): Desplazable => buscarLienzo() ?? ventana;
