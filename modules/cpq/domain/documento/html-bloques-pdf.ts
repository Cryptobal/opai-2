/**
 * Convierte el HTML ya saneado y con los campos reemplazados (plantilla de propuesta de la empresa) en bloques
 * simples para el PDF: títulos, párrafos, viñetas, tablas y reglas. Dominio puro, sin red: el PDF no carga nada
 * del HTML. El CSS se ignora salvo el `color` de títulos y párrafos; el resto lo pone la marca documental.
 */
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

type Nodo = DefaultTreeAdapterMap["childNode"];
type Elemento = DefaultTreeAdapterMap["element"];

export type FilaHtmlPdf = { celdas: string[]; encabezado: boolean };
export type BloqueHtmlPdf =
  | { t: "titulo"; nivel: number; texto: string; color: string | null }
  | { t: "parrafo"; texto: string; color: string | null }
  | { t: "item"; marca: string; texto: string }
  | { t: "tabla"; filas: FilaHtmlPdf[] }
  | { t: "regla" };

const TITULO = /^h([1-6])$/;
const PARRAFOS = new Set(["p", "blockquote", "address", "pre", "figcaption", "dt", "dd", "caption"]);
const EN_LINEA = new Set(["span", "strong", "b", "em", "i", "u", "s", "small", "sub", "sup", "mark", "abbr", "code", "time", "a", "br"]);
const COLOR = /(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s*(?:;|$)/i;

const esElemento = (n: Nodo): n is Elemento => "tagName" in n;
const hijos = (el: Elemento) => el.childNodes.filter(esElemento);
const colorDe = (el: Elemento) => COLOR.exec(el.attrs.find((a) => a.name === "style")?.value ?? "")?.[1] ?? null;

/** Texto visible de un nodo; `<br>` es salto de línea. */
function textoDe(n: Nodo): string {
  if (n.nodeName === "#text") return "value" in n ? n.value : "";
  if (!esElemento(n)) return "";
  if (n.tagName === "br") return "\n";
  return n.childNodes.map(textoDe).join("");
}
const limpio = (s: string) =>
  s.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");

function filasDe(tabla: Elemento, enCabeza = false): FilaHtmlPdf[] {
  return hijos(tabla).flatMap((el) => {
    if (el.tagName === "tr") {
      const celdas = hijos(el).filter((c) => c.tagName === "td" || c.tagName === "th");
      return [{ celdas: celdas.map((c) => limpio(textoDe(c))), encabezado: enCabeza || celdas.every((c) => c.tagName === "th") }];
    }
    return ["thead", "tbody", "tfoot"].includes(el.tagName) ? filasDe(el, el.tagName === "thead") : [];
  });
}

export function bloquesDeHtml(html: string): BloqueHtmlPdf[] {
  const out: BloqueHtmlPdf[] = [];
  const suelto: string[] = [];
  const vaciar = () => {
    const texto = limpio(suelto.splice(0).join(""));
    if (texto) out.push({ t: "parrafo", texto, color: null });
  };
  const bloque = (el: Elemento) => {
    const tag = el.tagName;
    const nivel = TITULO.exec(tag)?.[1];
    const texto = () => limpio(textoDe(el));
    if (nivel) out.push({ t: "titulo", nivel: Number(nivel), texto: texto(), color: colorDe(el) });
    else if (PARRAFOS.has(tag)) out.push({ t: "parrafo", texto: texto(), color: colorDe(el) });
    else if (tag === "ul" || tag === "ol")
      hijos(el).filter((li) => li.tagName === "li").forEach((li, k) =>
        out.push({ t: "item", marca: tag === "ol" ? `${k + 1}.` : "•", texto: limpio(textoDe(li)) }));
    else if (tag === "table") out.push({ t: "tabla", filas: filasDe(el).filter((f) => f.celdas.some(Boolean)) });
    else if (tag === "hr") out.push({ t: "regla" });
    else recorrer(el.childNodes);
  };
  const recorrer = (nodos: Nodo[]) => {
    for (const n of nodos) {
      if (!esElemento(n) || EN_LINEA.has(n.tagName)) {
        suelto.push(textoDe(n));
        continue;
      }
      vaciar();
      bloque(n);
    }
    vaciar();
  };
  recorrer(parseFragment(html).childNodes);
  return out.filter((b) => b.t === "regla" || (b.t === "tabla" ? b.filas.length > 0 : b.texto !== ""));
}
