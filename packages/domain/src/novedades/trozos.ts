import type { TrozoNovedad } from "./tipos-novedad";

/** Solo rutas internas (`/algo`, nunca `//host`) o https: nada de `javascript:` ni `data:`. */
export function hrefSeguroNovedad(href: string): string | null {
  const h = href.trim();
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

/** Trozos en línea: marca que aparece primero y el resto. */
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

/** Texto plano sin marcas (resúmenes, lectores de pantalla). */
export function textoPlanoNovedad(trozos: readonly TrozoNovedad[]): string {
  return trozos
    .map((t) => (t.tipo === "texto" || t.tipo === "codigo" ? t.texto : textoPlanoNovedad(t.trozos)))
    .join("");
}
