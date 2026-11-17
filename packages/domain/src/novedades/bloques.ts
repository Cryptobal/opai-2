import { consumirTablaMd } from "./tabla-md";
import { trozosNovedad } from "./trozos";
import type { BloqueNovedad } from "./tipos-novedad";

const ITEM = /^\s{0,3}(?:([-*+])|(\d{1,3})[.)])\s+(.*)$/;
const TITULO = /^ {0,3}#{1,6}[ \t]+/;

function textoTitulo(linea: string, prefijo: number): string {
  const t = linea.slice(prefijo).trim();
  let fin = t.length;
  while (fin > 0 && t[fin - 1] === "#") fin -= 1;
  return fin === 0 || t[fin - 1] === " " || t[fin - 1] === "\t" ? t.slice(0, fin).trim() : t;
}

type Estado = {
  bloques: BloqueNovedad[];
  parrafo: string[];
  lista: { ordenada: boolean; items: string[] } | null;
};

function cerrarParrafo(e: Estado) {
  if (e.parrafo.length) e.bloques.push({ tipo: "parrafo", trozos: trozosNovedad(e.parrafo.join(" ")) });
  e.parrafo = [];
}

function cerrarLista(e: Estado) {
  if (e.lista) e.bloques.push({ tipo: "lista", ordenada: e.lista.ordenada, items: e.lista.items.map(trozosNovedad) });
  e.lista = null;
}

/** Una línea: tabla, título, ítem de lista o párrafo. Devuelve el índice a seguir. */
function consumirLinea(e: Estado, crudas: string[], lineas: string[], i: number): number {
  const cruda = crudas[i] ?? "";
  const linea = lineas[i] ?? "";
  if (!linea) {
    cerrarParrafo(e);
    cerrarLista(e);
    return i;
  }
  const tabla = consumirTablaMd(lineas, i);
  if (tabla) {
    cerrarParrafo(e);
    cerrarLista(e);
    e.bloques.push({
      tipo: "tabla",
      encabezados: tabla.encabezados.map(trozosNovedad),
      filas: tabla.filas.map((f) => f.map(trozosNovedad)),
    });
    return tabla.fin;
  }
  const titulo = TITULO.exec(cruda);
  if (titulo) {
    cerrarParrafo(e);
    cerrarLista(e);
    e.bloques.push({ tipo: "titulo", trozos: trozosNovedad(textoTitulo(cruda, titulo[0].length)) });
    return i;
  }
  const item = ITEM.exec(cruda);
  if (item) {
    cerrarParrafo(e);
    const ordenada = item[2] !== undefined;
    if (e.lista && e.lista.ordenada !== ordenada) cerrarLista(e);
    e.lista ??= { ordenada, items: [] };
    e.lista.items.push(item[3] ?? "");
    return i;
  }
  if (e.lista && /^\s+/.test(cruda) && e.lista.items.length) {
    e.lista.items[e.lista.items.length - 1] += ` ${linea}`;
    return i;
  }
  cerrarLista(e);
  e.parrafo.push(linea);
  return i;
}

/** Bloques del cuerpo: párrafos, listas, títulos y tablas GFM. */
export function bloquesNovedad(markdown: string): BloqueNovedad[] {
  const e: Estado = { bloques: [], parrafo: [], lista: null };
  const crudas = markdown.replace(/\r\n?/g, "\n").split("\n");
  const lineas = crudas.map((l) => l.trim());
  for (let i = 0; i < crudas.length; i++) i = consumirLinea(e, crudas, lineas, i);
  cerrarParrafo(e);
  cerrarLista(e);
  return e.bloques;
}
