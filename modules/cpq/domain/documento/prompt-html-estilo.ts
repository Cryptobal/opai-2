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
    `- Elementos permitidos: ${[...ELEMENTOS_PERMITIDOS].map((t) => `\`${t}\``).join(", ")}.`,
    "- Estilos solo en el atributo `style` de cada elemento. Sin `<style>`, `<link>`, `<script>`, `<img>`, `<svg>`, formularios ni marcos.",
    `- Propiedades CSS permitidas: ${[...PROPIEDADES_CSS].join(", ")}. Sin \`url(…)\`, \`position\` ni \`@import\`.`,
    "- Enlaces solo `https:`, `mailto:` o `tel:`. Nada se carga desde internet: sin fuentes, imágenes ni hojas de estilo remotas.",
    "- Los marcadores van en el texto, nunca dentro de un atributo. En tablas, cada marcador va dentro de una celda (`<td>` o `<th>`).",
    "- No escribas atributos `on…` (por ejemplo `onclick`). Lo que no esté permitido hace que OPAI rechace el HTML al importarlo.",
  ];
}
