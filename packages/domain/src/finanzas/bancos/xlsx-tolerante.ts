// Lector XLSX tolerante para cartolas que ExcelJS no abre (CAR-284). Santander Chile entrega su «Cartola
// Provisoria» e «Historial de cuenta» con relaciones de destino absoluto, la hoja en `sheet.xml` y el
// prefijo de espacio de nombres `x:`; ExcelJS falla con «Cannot read properties of undefined (reading
// 'sheets')». Solo lee la grilla de la primera hoja (texto y números), sin fórmulas ni estilos.
import JSZip from "jszip";

export type CeldaXlsx = string | number | null;

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Decodifica las entidades XML básicas y numéricas. */
function decodificar(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (todo, ent: string) => {
    if (ent.startsWith("#x") || ent.startsWith("#X")) return String.fromCodePoint(parseInt(ent.slice(2), 16));
    if (ent.startsWith("#")) return String.fromCodePoint(parseInt(ent.slice(1), 10));
    return ENTIDADES[ent.toLowerCase()] ?? todo;
  });
}

/** Texto de un nodo con uno o varios `<t>` (texto simple o rich text), con o sin prefijo. */
function textoDeNodos(xml: string): string {
  let out = "";
  for (const m of xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)) out += decodificar(m[1] ?? "");
  return out;
}

/** «A1» → 0, «AB7» → 27. */
function columnaDe(ref: string): number | null {
  const letras = /^([A-Z]+)/.exec(ref)?.[1];
  if (!letras) return null;
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function atributo(attrs: string, nombre: string): string | null {
  return new RegExp(`\\b${nombre}="([^"]*)"`).exec(attrs)?.[1] ?? null;
}

async function hojaPrincipal(zip: JSZip): Promise<string | null> {
  const directa = zip.file("xl/worksheets/sheet1.xml") ?? zip.file("xl/worksheets/sheet.xml");
  if (directa) return directa.async("string");
  const otra = zip.file(/^\/?xl\/worksheets\/[^/]+\.xml$/)[0];
  return otra ? otra.async("string") : null;
}

/** Filas de la primera hoja como matriz; vacía si el archivo no trae una hoja legible. */
export async function leerXlsxTolerante(contenido: Uint8Array): Promise<CeldaXlsx[][]> {
  const zip = await JSZip.loadAsync(contenido);
  const compartidos: string[] = [];
  const sst = zip.file("xl/sharedStrings.xml");
  if (sst) {
    const xml = await sst.async("string");
    for (const m of xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)) compartidos.push(textoDeNodos(m[1] ?? ""));
  }
  const hoja = await hojaPrincipal(zip);
  if (!hoja) return [];

  const filas: CeldaXlsx[][] = [];
  for (const fila of hoja.matchAll(/<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const celdas: CeldaXlsx[] = [];
    const cuerpo = fila[1] ?? "";
    for (const c of cuerpo.matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = c[1] ?? "";
      const interior = c[2] ?? "";
      const ref = atributo(attrs, "r");
      const col = ref ? columnaDe(ref) : null;
      while (col != null && celdas.length < col) celdas.push(null);
      const tipo = atributo(attrs, "t");
      const v = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(interior)?.[1];
      let valor: CeldaXlsx = null;
      if (tipo === "s") valor = v != null ? (compartidos[Number(v)] ?? null) : null;
      else if (tipo === "inlineStr") valor = textoDeNodos(interior);
      else if (tipo === "str" || tipo === "e") valor = v != null ? decodificar(v) : null;
      else if (tipo === "b") valor = v === "1" ? 1 : 0;
      else if (v != null && v !== "") {
        const n = Number(v);
        valor = Number.isFinite(n) ? n : decodificar(v);
      }
      celdas.push(valor);
    }
    filas.push(celdas);
  }
  return filas;
}
