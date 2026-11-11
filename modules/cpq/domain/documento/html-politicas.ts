/**
 * Política del saneado de HTML importado (CAR-138, PR 9). Lista blanca: todo lo que no está aquí se rechaza.
 * El HTML se guarda como plantilla de texto con marcadores del catálogo; hoy NO lo convierte a PDF ningún renderer
 * (el PDF sigue siendo `pdf-lib`, ver el brief).
 */

/** Elementos de estructura y texto permitidos. Sin formularios, medios, marcos, scripts ni estilos incrustados. */
export const ELEMENTOS_PERMITIDOS: ReadonlySet<string> = new Set([
  "div", "span", "p", "section", "article", "header", "footer", "main", "aside", "address", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd",
  "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td",
  "strong", "b", "em", "i", "u", "s", "small", "sub", "sup", "mark", "abbr", "code", "pre", "blockquote", "time",
  "br", "hr", "a",
]);

export const ELEMENTOS_VACIOS: ReadonlySet<string> = new Set(["br", "hr", "col"]);

/** Elementos que ejecutan código o toman el control de la página. */
export const ELEMENTOS_ACTIVOS: ReadonlySet<string> = new Set([
  "script", "noscript", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "input", "button",
  "select", "textarea", "option", "svg", "math", "template", "slot", "dialog",
]);

/** Elementos que cargan o declaran recursos de red (hojas de estilo, imágenes, medios, base, estilos con url). */
export const ELEMENTOS_RECURSO: ReadonlySet<string> = new Set([
  "link", "style", "base", "img", "picture", "source", "video", "audio", "track", "canvas", "image",
]);

/** Envoltorios del documento: se atraviesan sin emitirlos (`title` y `meta` sin `http-equiv` se descartan). */
export const ELEMENTOS_IGNORADOS: ReadonlySet<string> = new Set(["html", "head", "body"]);

const GLOBALES = ["class", "style", "title", "lang", "dir", "aria-label", "aria-hidden"];
export const ATRIBUTOS_POR_ELEMENTO: Readonly<Record<string, readonly string[]>> = {
  a: ["href"],
  td: ["colspan", "rowspan", "headers"],
  th: ["colspan", "rowspan", "scope", "headers"],
  col: ["span"],
  colgroup: ["span"],
  ol: ["start", "type", "reversed"],
  li: ["value"],
  time: ["datetime"],
  abbr: [],
};
export const atributosPermitidos = (elemento: string): ReadonlySet<string> =>
  new Set([...GLOBALES, ...(ATRIBUTOS_POR_ELEMENTO[elemento] ?? [])]);

export const LIMITES_HTML = { bytes: 400_000, profundidad: 48, nodos: 15_000, problemas: 40 } as const;

/** Propiedades CSS permitidas en `style`. Sin `position`, `content`, `behavior`, `filter` ni `@import`. */
export const PROPIEDADES_CSS: ReadonlySet<string> = new Set([
  "color", "background", "background-color", "opacity",
  "border", "border-top", "border-right", "border-bottom", "border-left", "border-color", "border-style",
  "border-width", "border-radius", "border-collapse", "border-spacing",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "gap", "row-gap", "column-gap", "display", "flex", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink",
  "flex-basis", "align-items", "align-self", "align-content", "justify-content", "justify-items",
  "grid-template-columns", "grid-template-rows", "grid-column", "grid-row", "grid-gap",
  "width", "min-width", "max-width", "height", "min-height", "max-height", "box-sizing", "overflow",
  "font-size", "font-weight", "font-style", "font-variant-numeric", "line-height", "letter-spacing",
  "text-align", "text-transform", "text-decoration", "text-wrap", "text-indent", "white-space", "vertical-align",
  "word-break", "overflow-wrap", "list-style-type", "page-break-inside", "page-break-before", "page-break-after",
  "break-inside", "break-before", "break-after", "table-layout",
]);

/** Funciones CSS permitidas en un valor. Cualquier otra (`url`, `image-set`, `expression`, `attr`…) rechaza. */
export const FUNCIONES_CSS: ReadonlySet<string> = new Set([
  "var", "calc", "min", "max", "clamp", "rgb", "rgba", "hsl", "hsla", "oklch", "color-mix", "minmax", "repeat",
]);
