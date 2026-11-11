// Controles del marco Hilo (diseño aprobado): 44 px de alto, radio 12. Lo humano va en tinta; el
// índigo queda para lo que viene del agente (ADR-090).
const BASE = "inline-flex h-11 items-center whitespace-nowrap transition-colors";

/** Acción principal: tinta sobre fondo. */
export const BTN_TINTA = `${BASE} gap-2 rounded-[12px] bg-fg px-[18px] text-base font-semibold text-bg hover:opacity-90`;
/** Acción secundaria: borde fino sobre la superficie. */
export const BTN_LINEA = `${BASE} gap-2 rounded-[12px] border border-border bg-surface px-4 text-base font-semibold text-fg hover:bg-fill`;
/** Botón de solo icono. */
export const BTN_ICONO =
  "inline-flex size-11 flex-none items-center justify-center rounded-[12px] text-fg-muted transition-colors hover:bg-fill hover:text-fg";
/** Encabezado de sección en versalitas. */
export const SOBRE = "text-xs font-semibold tracking-[0.06em] text-fg-muted uppercase";
/** Fila con borde inferior y 44 px de alto mínimo. */
export const FILA = "flex min-h-[52px] w-full items-center gap-3 border-b border-border py-2.5 text-left";
/** Márgenes laterales de la columna del hilo (18 · 20 · 26 px). */
export const PAD_HILO = "px-[18px] lg:px-5 hilo:px-[26px]";
/** Márgenes laterales de la cabecera del lienzo y de la barra (18 · 28 · 44 px, como el diseño). */
export const PAD_LIENZO = "px-[18px] lg:px-7 hilo:px-11";
/**
 * Contenido del lienzo: márgenes del diseño (28 · 44 px; arriba 18 · 24 · 32 px). En teléfono son 16 px,
 * porque las páginas llevan sus listas de borde a borde con un margen negativo de 16 px. Las variables
 * le dicen a la vista dividida cuánto compensar y cuánto alto le queda (cabecera de 64 px más la barra).
 */
export const PAD_CONTENIDO =
  "px-4 pt-[18px] pb-10 md:px-7 md:pt-6 hilo:px-11 hilo:pt-8 [--lienzo-x:1.75rem] [--lienzo-t:1.5rem] [--lienzo-b:2.5rem] [--lienzo-resto:calc(150px+env(safe-area-inset-top)+env(safe-area-inset-bottom))] lg:[--lienzo-resto:147px] hilo:[--lienzo-x:2.75rem] hilo:[--lienzo-t:2rem]";
/** Barra de desplazamiento oculta en las listas del hilo, como en el diseño. */
export const SIN_BARRA = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
