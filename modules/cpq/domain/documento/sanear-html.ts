/**
 * Saneado del HTML importado como plantilla de propuesta (CAR-138, PR 9). Dominio puro: parsea con parse5 (HTML5
 * conforme a la especificación), recorre el árbol contra una lista blanca y vuelve a serializar solo lo permitido.
 * Rechaza (no guarda nada) lo que ejecuta código, usa red o trae marcadores que el catálogo no conoce.
 */
import { parse, type DefaultTreeAdapterMap } from "parse5";

import { VERSION_CATALOGO_CAMPOS, validarPlantillaCampos } from "@opai/domain";

import { sanearEstilo } from "./html-estilo";
import {
  ELEMENTOS_ACTIVOS, ELEMENTOS_IGNORADOS, ELEMENTOS_PERMITIDOS, ELEMENTOS_RECURSO, ELEMENTOS_VACIOS, LIMITES_HTML,
  atributosPermitidos,
} from "./html-politicas";

type Nodo = DefaultTreeAdapterMap["childNode"];
type Elemento = DefaultTreeAdapterMap["element"];

export type CodigoHtml =
  | "elemento_activo" | "recurso_externo" | "elemento_no_permitido" | "manejador_evento" | "url_no_permitida"
  | "estilo_no_permitido" | "token_en_atributo" | "token" | "marcador_movido" | "limite" | "vacio";
export type ProblemaHtml = { codigo: CodigoHtml; mensaje: string; detalle?: string };
export type AdvertenciaHtml = { codigo: "atributo_quitado" | "estilo_quitado"; mensaje: string; detalle?: string };

export type ResultadoSaneado = {
  ok: boolean;
  /** Fragmento saneado (solo el cuerpo). Vacío si hay problemas: nada inseguro sale de aquí. */
  html: string;
  problemas: ProblemaHtml[];
  advertencias: AdvertenciaHtml[];
  /** Claves canónicas del catálogo usadas por la plantilla y colecciones de repetición. */
  tokens: { usados: string[]; colecciones: string[] };
  catalogoVersion: number;
};

const esc = (s: string, attr = false) => {
  const t = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return attr ? t.replace(/"/g, "&quot;") : t;
};
const TIENE_TOKEN = /\{\{|\}\}/;

const bytesDe = (t: string) => new TextEncoder().encode(t).length;
const marcadores = (t: string) => [...t.matchAll(/\{\{[^{}]*\}\}/g)].map((m) => m[0].replace(/\s+/g, ""));

function urlSegura(v: string): boolean {
  const t = v.trim();
  if (t.startsWith("#")) return /^#[\w-]*$/.test(t);
  if (/^(mailto|tel):[^\s<>"]+$/i.test(t)) return true;
  try {
    const u = new URL(t);
    return /^https:\/\/[^\s/]/i.test(t) && u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

export function sanearHtml(entrada: string): ResultadoSaneado {
  const problemas: ProblemaHtml[] = [];
  const advertencias: AdvertenciaHtml[] = [];
  const visto = new Set<string>();
  const marcar = <T extends { codigo: string; mensaje: string; detalle?: string }>(lista: T[], p: T) => {
    const k = `${p.codigo}|${p.detalle ?? p.mensaje}`;
    if (!visto.has(k) && lista.length < LIMITES_HTML.problemas) lista.push(p);
    visto.add(k);
  };
  const vacio = (): ResultadoSaneado => ({
    ok: false, html: "", problemas, advertencias, tokens: { usados: [], colecciones: [] }, catalogoVersion: VERSION_CATALOGO_CAMPOS,
  });
  if (bytesDe(entrada) > LIMITES_HTML.bytes) {
    problemas.push({ codigo: "limite", mensaje: `El HTML supera los ${LIMITES_HTML.bytes} bytes.` });
    return vacio();
  }
  let nodos = 0;

  const atributos = (el: Elemento, tag: string): string => {
    const permitidos = atributosPermitidos(tag);
    let out = "";
    for (const { name, value } of el.attrs) {
      const n = name.toLowerCase();
      if (n.startsWith("on")) marcar(problemas, { codigo: "manejador_evento", mensaje: `El atributo «${n}» ejecuta código.`, detalle: `${tag}.${n}` });
      else if (TIENE_TOKEN.test(value)) marcar(problemas, { codigo: "token_en_atributo", mensaje: "Los marcadores {{…}} solo van en el texto, no en atributos.", detalle: `${tag}.${n}` });
      else if (!permitidos.has(n)) marcar(advertencias, { codigo: "atributo_quitado", mensaje: `Se quitó el atributo «${n}».`, detalle: `${tag}.${n}` });
      else if (n === "style") {
        const e = sanearEstilo(value);
        e.errores.forEach((m) => marcar(problemas, { codigo: "estilo_no_permitido", mensaje: m, detalle: m }));
        e.quitadas.forEach((q) => marcar(advertencias, { codigo: "estilo_quitado", mensaje: `Se quitó la propiedad «${q}».`, detalle: q }));
        if (e.css) out += ` style="${esc(e.css, true)}"`;
      } else if (n === "href") {
        if (urlSegura(value)) out += ` href="${esc(value.trim(), true)}"`;
        else marcar(problemas, { codigo: "url_no_permitida", mensaje: "Un enlace solo puede ser https, mailto, tel o interno (#).", detalle: value.slice(0, 80) });
      } else if (n === "class") {
        const c = value.replace(/[^\w\- ]/g, "").trim();
        if (c) out += ` class="${esc(c, true)}"`;
      } else out += ` ${n}="${esc(value, true)}"`;
    }
    return tag === "a" && out.includes("href=") ? `${out} rel="noopener noreferrer"` : out;
  };

  const recorrer = (n: Nodo, nivel: number, emitir: boolean): string => {
    if (++nodos > LIMITES_HTML.nodos || nivel > LIMITES_HTML.profundidad) {
      marcar(problemas, { codigo: "limite", mensaje: "El HTML es demasiado grande o está demasiado anidado." });
      return "";
    }
    if (n.nodeName === "#text") return emitir ? esc((n as DefaultTreeAdapterMap["textNode"]).value) : "";
    if (!("tagName" in n)) return "";
    const el = n as Elemento;
    const tag = el.tagName.toLowerCase();
    if (tag === "title" || (tag === "meta" && !el.attrs.some((a) => a.name.toLowerCase() === "http-equiv"))) return "";
    if (ELEMENTOS_IGNORADOS.has(tag)) return el.childNodes.map((c) => recorrer(c, nivel + 1, emitir)).join("");
    const permitido = ELEMENTOS_PERMITIDOS.has(tag);
    if (ELEMENTOS_ACTIVOS.has(tag)) marcar(problemas, { codigo: "elemento_activo", mensaje: `El elemento <${tag}> puede ejecutar código o controlar la página.`, detalle: tag });
    else if (ELEMENTOS_RECURSO.has(tag)) marcar(problemas, { codigo: "recurso_externo", mensaje: `El elemento <${tag}> carga o declara recursos externos.`, detalle: tag });
    else if (!permitido) marcar(problemas, { codigo: "elemento_no_permitido", mensaje: `El elemento <${tag}> no está permitido.`, detalle: tag });
    const attrs = atributos(el, tag);
    const hijos = el.childNodes.map((c) => recorrer(c, nivel + 1, emitir && permitido)).join("");
    if (!emitir || !permitido) return "";
    return ELEMENTOS_VACIOS.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${hijos}</${tag}>`;
  };

  const doc = parse(entrada);
  const html = doc.childNodes.map((c) => recorrer(c, 0, true)).join("").trim();
  const texto = html.replace(/<[^>]*>/g, "").trim();
  if (!texto && problemas.length === 0) problemas.push({ codigo: "vacio", mensaje: "El HTML no tiene contenido." });
  if (bytesDe(html) > LIMITES_HTML.bytes) marcar(problemas, { codigo: "limite", mensaje: `El HTML saneado supera los ${LIMITES_HTML.bytes} bytes.` });
  // El parser HTML5 reubica el texto que no puede vivir donde está (p. ej. un marcador directo dentro de <table>):
  // si el orden de los marcadores cambió, la plantilla ya no significa lo que escribió quien la diseñó.
  const antes = marcadores(entrada.replace(/<!--[\s\S]*?-->/g, "")).join("\n");
  if (problemas.length === 0 && antes !== marcadores(html).join("\n"))
    marcar(problemas, { codigo: "marcador_movido", mensaje: "Algún marcador {{…}} cambió de lugar al leer el HTML (por ejemplo, está directo dentro de <table> o <tr>). Colócalo dentro de una celda (<td>) o de un contenedor." });
  const val = validarPlantillaCampos(html, "propuesta");
  for (const p of val.problemas) marcar(problemas, { codigo: "token", mensaje: p.mensaje, ...(p.token ? { detalle: p.token } : {}) });
  if (problemas.length > 0) return vacio();
  return { ok: true, html, problemas, advertencias, tokens: { usados: val.usados, colecciones: val.colecciones }, catalogoVersion: VERSION_CATALOGO_CAMPOS };
}
