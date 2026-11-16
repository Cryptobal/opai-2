/**
 * Partes del prompt exportable que piden HTML importable y el estilo de la empresa (CAR-531). Las reglas salen de
 * la misma política del saneado (`html-politicas.ts`): lo que el prompt pide es lo que el importador acepta.
 */
import type { TipografiaDocumento } from "./bloques";
import { ELEMENTOS_PERMITIDOS, PROPIEDADES_CSS } from "./html-politicas";

/** Estilo ya guardado en la marca de la empresa (Configuración › Marca y la marca documental del CPQ). */
export type EstiloEmpresa = {
  colorPrimario: string | null;
  colorSecundario: string | null;
  tipografia: TipografiaDocumento;
  tieneLogo: boolean;
};

const TIPOGRAFIA: Record<TipografiaDocumento, string> = {
  inter: "Inter (sans serif)",
  helvetica: "Helvetica (sans serif)",
  times: "Times (serif)",
};

export function seccionEstilo(e: EstiloEmpresa): string[] {
  const color = (c: string | null, uso: string) =>
    c && /^#[0-9a-f]{3,8}$/i.test(c) ? `- Color ${uso}: \`${c}\`.` : `- Sin color ${uso} definido: usa grises neutros.`;
  return [
    "## Estilo de la empresa",
    "",
    color(e.colorPrimario, "primario (títulos, líneas y encabezados de tabla)"),
    color(e.colorSecundario, "secundario (acentos y fondos suaves)"),
    `- Tipografía: ${TIPOGRAFIA[e.tipografia]}. OPAI la aplica al generar el PDF: no declares \`font-family\`.`,
    e.tieneLogo
      ? "- La empresa tiene logo: OPAI lo pone en el encabezado de cada página. No lo incluyas ni dejes espacio para él."
      : "- La empresa no tiene logo cargado: no lo incluyas.",
    "",
  ];
}

export function seccionEntregaHtml(): string[] {
  return [
    "## Entrega: un fragmento HTML",
    "",
    "Devuelve un único fragmento HTML (solo el contenido del cuerpo, sin `<html>`, `<head>` ni `<body>`) con los marcadores literales en su lugar.",
    "",
    "### Estructura recomendada (nivel agencia)",
    "",
    "1. **Portada** a pantalla completa: marca, título de la cotización, cliente, número y fecha (usa solo marcadores de la tabla «Marcadores disponibles»).",
    "2. **`{{secciones}}`** en su propia línea: OPAI inserta índice, cuerpo, tablas de puestos/turnos, resumen económico en tarjeta, capítulos por instalación y contacto del ejecutivo.",
    "3. **Cierre** breve con datos de la empresa y del ejecutivo cuando existan marcadores en el catálogo.",
    "4. Tipografía clara, tablas con cabecera contrastada, tarjeta para totales (`border-radius`, `padding`). Íconos solo con **SVG inline** (sin `href` ni imágenes remotas).",
    "",
    "### Reglas técnicas",
    "",
    `- Elementos permitidos: ${[...ELEMENTOS_PERMITIDOS].map((t) => `\`${t}\``).join(", ")}.`,
    "- Estilos en el atributo `style` y/o en uno o más bloques `<style>` al inicio (solo reglas simples; OPAI sanitiza y quita lo inseguro).",
    "- Sin `<link>`, `<script>`, `<img>`, formularios ni marcos. Sin `url(…)`, `@import` ni `position`.",
    `- Propiedades CSS permitidas: ${[...PROPIEDADES_CSS].join(", ")} y variables --marca-* en bloques style.`,
    "- Enlaces solo `https:`, `mailto:` o `tel:`. Sin recursos remotos.",
    "- Los marcadores van en el texto, nunca dentro de un atributo. En tablas, cada marcador va dentro de una celda (`<td>` o `<th>`).",
    "- No escribas atributos `on…`. Lo que no esté permitido hace que OPAI rechace el HTML al importarlo.",
  ];
}

/** `{{secciones}}`: el lugar del documento donde OPAI inserta las secciones que la empresa arma en el armador. */
export function seccionSecciones(): string[] {
  return [
    "## Secciones del documento",
    "",
    "El texto de cada propuesta lo arma la empresa en OPAI, sección por sección (comprensión del servicio, metodología, condiciones, etc.). Tú diseñas el marco: el marcador `{{secciones}}` en su propia línea, fuera de tablas y de otros marcadores, es donde OPAI inserta ese contenido.",
    "- OPAI inserta, en orden, el índice, el título y el texto de cada sección activa, el detalle del servicio y los capítulos por instalación. Las secciones sin texto no aparecen.",
    "- Usa `{{secciones}}` una sola vez. Si lo omites, OPAI pone las secciones al final del documento.",
    "- No redactes ni repitas esas secciones: diseña lo que va antes (portada, datos del cliente y del negocio) y después (cierre y firma), con sus marcadores.",
    "- Con `{{secciones}}` no uses `{{tabla_servicio}}` ni `{{resumen_economico}}`: el detalle del servicio, el resumen económico y el contacto del ejecutivo ya van dentro y saldrían dos veces.",
    "- Los títulos y párrafos que OPAI inserta toman el estilo del documento (colores y tipografía de la empresa).",
    "",
  ];
}
