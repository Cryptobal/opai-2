import { consumirTablaMd } from "./tabla-md";
import { hrefSeguroNovedad, textoPlanoNovedad, trozosNovedad } from "./trozos";
import type { BloqueNovedad } from "./tipos-novedad";

/**
 * Formato de las novedades (CAR-316) y del chat del agente (CAR-525): Markdown sencillo sin HTML.
 * Párrafos, listas, títulos, tablas GFM, **negrita**, *cursiva*, `código` y enlaces internos o https.
 */
export type { BloqueNovedad, TrozoNovedad } from "./tipos-novedad";
export { hrefSeguroNovedad, textoPlanoNovedad, trozosNovedad };

const ITEM = /^\s{0,3}(?:([-*+])|(\d{1,3})[.)])\s+(.*)$/;
const TITULO = /^ {0,3}#{1,6}[ \t]+/;

function textoTitulo(linea: string, prefijo: number): string {
  const t = linea.slice(prefijo).trim();
  let fin = t.length;
  while (fin > 0 && t[fin - 1] === "#") fin -= 1;
  return fin === 0 || t[fin - 1] === " " || t[fin - 1] === "\t" ? t.slice(0, fin).trim() : t;
}

/** Bloques del cuerpo: párrafos, listas, títulos y tablas GFM. */
export function bloquesNovedad(markdown: string): BloqueNovedad[] {
  const bloques: BloqueNovedad[] = [];
  let parrafo: string[] = [];
  let lista: { ordenada: boolean; items: string[] } | null = null;
  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push({ tipo: "parrafo", trozos: trozosNovedad(parrafo.join(" ")) });
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista) bloques.push({ tipo: "lista", ordenada: lista.ordenada, items: lista.items.map(trozosNovedad) });
    lista = null;
  };
  const crudas = markdown.replace(/\r\n?/g, "\n").split("\n");
  const lineas = crudas.map((l) => l.trim());
  for (let i = 0; i < crudas.length; i++) {
    const cruda = crudas[i] ?? "";
    const linea = lineas[i] ?? "";
    if (!linea) {
      cerrarParrafo();
      cerrarLista();
      continue;
    }
    const tabla = consumirTablaMd(lineas, i);
    if (tabla) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({
        tipo: "tabla",
        encabezados: tabla.encabezados.map(trozosNovedad),
        filas: tabla.filas.map((f) => f.map(trozosNovedad)),
      });
      i = tabla.fin;
      continue;
    }
    const titulo = TITULO.exec(cruda);
    if (titulo) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({ tipo: "titulo", trozos: trozosNovedad(textoTitulo(cruda, titulo[0].length)) });
      continue;
    }
    const item = ITEM.exec(cruda);
    if (item) {
      cerrarParrafo();
      const ordenada = item[2] !== undefined;
      if (lista && lista.ordenada !== ordenada) cerrarLista();
      lista ??= { ordenada, items: [] };
      lista.items.push(item[3] ?? "");
      continue;
    }
    if (lista && /^\s+/.test(cruda) && lista.items.length) {
      lista.items[lista.items.length - 1] += ` ${linea}`;
      continue;
    }
    cerrarLista();
    parrafo.push(linea);
  }
  cerrarParrafo();
  cerrarLista();
  return bloques;
}
