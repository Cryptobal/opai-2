/**
 * Formato de las novedades (CAR-316): el cuerpo de cada entrada es Markdown sencillo escrito para
 * personas de negocio. Aquí se convierte en piezas tipadas (bloques y trozos en línea) para que la
 * interfaz las dibuje con elementos propios, sin HTML crudo ni `dangerouslySetInnerHTML`: cualquier
 * etiqueta que aparezca en el texto queda como texto. Solo cubre lo que usan las entradas: párrafos,
 * listas, títulos cortos, **negrita**, *cursiva*, `código` y enlaces internos o https.
 */
export type TrozoNovedad =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrita"; trozos: TrozoNovedad[] }
  | { tipo: "cursiva"; trozos: TrozoNovedad[] }
  | { tipo: "codigo"; texto: string }
  | { tipo: "enlace"; href: string; trozos: TrozoNovedad[] };

export type BloqueNovedad =
  | { tipo: "parrafo"; trozos: TrozoNovedad[] }
  | { tipo: "titulo"; trozos: TrozoNovedad[] }
  | { tipo: "lista"; ordenada: boolean; items: TrozoNovedad[][] };

/** Solo rutas internas (`/algo`, nunca `//host`) o https: nada de `javascript:` ni `data:`. */
export function hrefSeguroNovedad(href: string): string | null {
  const h = href.trim();
  // Espacios o caracteres de control en medio: el navegador los quita y `/\t/host` sería `//host`.
  if ([...h].some((c) => c.trim() === "" || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return null;
  if (/^\/(?![/\\])/.test(h)) return h;
  if (/^https:\/\/[^\s/\\]/i.test(h)) return h;
  return null;
}

type Regla = { re: RegExp; crear: (m: RegExpExecArray) => TrozoNovedad };

const REGLAS: readonly Regla[] = [
  { re: /`([^`\n]+)`/, crear: (m) => ({ tipo: "codigo", texto: m[1] ?? "" }) },
  {
    re: /\[([^\]\n]+)\]\(([^)\s]+)\)/,
    crear: (m) => {
      const href = hrefSeguroNovedad(m[2] ?? "");
      const trozos = trozosNovedad(m[1] ?? "");
      return href ? { tipo: "enlace", href, trozos } : { tipo: "texto", texto: m[1] ?? "" };
    },
  },
  { re: /\*\*(?=\S)([\s\S]*?\S)\*\*/, crear: (m) => ({ tipo: "negrita", trozos: trozosNovedad(m[1] ?? "") }) },
  { re: /__(?=\S)([\s\S]*?\S)__/, crear: (m) => ({ tipo: "negrita", trozos: trozosNovedad(m[1] ?? "") }) },
  { re: /\*(?=[^\s*])([^*\n]*?[^\s*])\*/, crear: (m) => ({ tipo: "cursiva", trozos: trozosNovedad(m[1] ?? "") }) },
  {
    re: /(?<![\p{L}\p{N}])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\p{L}\p{N}])/u,
    crear: (m) => ({ tipo: "cursiva", trozos: trozosNovedad(m[1] ?? "") }),
  },
];

function agregarTexto(salida: TrozoNovedad[], texto: string): void {
  if (!texto) return;
  const ultimo = salida.at(-1);
  if (ultimo?.tipo === "texto") ultimo.texto += texto;
  else salida.push({ tipo: "texto", texto });
}

/** Trozos en línea de un texto: busca la marca que aparece primero y sigue con el resto. */
export function trozosNovedad(texto: string): TrozoNovedad[] {
  const salida: TrozoNovedad[] = [];
  let resto = texto;
  while (resto) {
    let mejor: { m: RegExpExecArray; regla: Regla } | null = null;
    for (const regla of REGLAS) {
      const m = regla.re.exec(resto);
      if (m && (!mejor || m.index < mejor.m.index)) mejor = { m, regla };
    }
    if (!mejor) {
      agregarTexto(salida, resto);
      break;
    }
    agregarTexto(salida, resto.slice(0, mejor.m.index));
    const trozo = mejor.regla.crear(mejor.m);
    if (trozo.tipo === "texto") agregarTexto(salida, trozo.texto);
    else salida.push(trozo);
    resto = resto.slice(mejor.m.index + mejor.m[0].length);
  }
  return salida;
}

const ITEM = /^\s{0,3}(?:([-*+])|(\d{1,3})[.)])\s+(.*)$/;
const TITULO = /^ {0,3}#{1,6}[ \t]/;

/** Texto de un título `## Algo ##` sin el cierre de almohadillas (sin regex con retroceso). */
function textoTitulo(linea: string, prefijo: number): string {
  const t = linea.slice(prefijo).trim();
  let fin = t.length;
  while (fin > 0 && t[fin - 1] === "#") fin -= 1;
  return fin === 0 || t[fin - 1] === " " || t[fin - 1] === "\t" ? t.slice(0, fin).trim() : t;
}

/** Bloques del cuerpo: párrafos separados por línea en blanco, listas y títulos cortos. */
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
  for (const cruda of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const linea = cruda.trim();
    if (!linea) {
      cerrarParrafo();
      cerrarLista();
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
      // Continuación del último ítem de la lista (línea con sangría).
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

/** Texto plano sin marcas (resúmenes, lectores de pantalla, avisos de una línea). */
export function textoPlanoNovedad(trozos: readonly TrozoNovedad[]): string {
  return trozos
    .map((t) => (t.tipo === "texto" || t.tipo === "codigo" ? t.texto : textoPlanoNovedad(t.trozos)))
    .join("");
}
