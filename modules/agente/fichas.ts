import type { Referencia } from "./referencias";

/** Ficha de entidad que el chat dibuja como tarjeta (CAR-523). */
export function esHrefFicha(href: string): boolean {
  return /^\/(cuentas|personas|negocios|cotizaciones|finanzas\/ventas)\/[^/]+$/i.test(href);
}

export function pideFichas(texto: string): boolean {
  return /\b(tarjeta|tarjetas|ficha|fichas)\b/i.test(texto);
}

/** Lista corta de cuentas, personas, negocios, cotizaciones o facturas. */
export function listaCortaDeEntidades(refs: readonly Referencia[]): boolean {
  return refs.length >= 1 && refs.length <= 4 && refs.every((r) => esHrefFicha(r.href));
}

/** Cuándo el hilo dibuja fichas y deja el markdown solo como respaldo. */
export function debeDibujarFichas(pedido: string, refs: readonly Referencia[]): boolean {
  if (!refs.length) return false;
  if (pideFichas(pedido)) return refs.some((r) => esHrefFicha(r.href));
  return listaCortaDeEntidades(refs);
}

/** Quita viñetas que solo repiten las fichas; deja prosa corta como respaldo (CAR-523). */
export function textoRespaldoFichas(texto: string, refs: readonly Referencia[]): string {
  if (!refs.length) return texto;
  const titulos = new Set(refs.map((r) => r.titulo.toLowerCase()));
  const hrefs = new Set(refs.map((r) => r.href));
  const out: string[] = [];
  for (const linea of texto.split("\n")) {
    const t = linea.trim();
    const vineta = /^[-*•]\s+/.test(t) || /^\d+\.\s+/.test(t);
    if (!vineta) {
      out.push(linea);
      continue;
    }
    const cuerpo = t.replace(/^([- *•]+|\d+\.)\s+/, "");
    const md = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(cuerpo);
    if (md && hrefs.has(md[2]!)) continue;
    if (titulos.has(cuerpo.toLowerCase())) continue;
    if ([...titulos].some((tit) => cuerpo.toLowerCase().includes(tit))) continue;
    out.push(linea);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
