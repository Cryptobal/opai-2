import type { ReferenciaEntidad } from "./tipos";

/** Misma regla que `modules/agente/fichas.ts` (CAR-523); el cliente no importa el módulo. */
export function esHrefFicha(href: string): boolean {
  return /^\/(cuentas|personas|negocios|cotizaciones|finanzas\/ventas)\/[^/]+$/i.test(href);
}

export function pideFichas(texto: string): boolean {
  return /\b(tarjeta|tarjetas|ficha|fichas)\b/i.test(texto);
}

export function listaCortaDeEntidades(refs: readonly ReferenciaEntidad[]): boolean {
  return refs.length >= 1 && refs.length <= 4 && refs.every((r) => esHrefFicha(r.href));
}

export function debeDibujarFichas(pedido: string, refs: readonly ReferenciaEntidad[]): boolean {
  if (!refs.length) return false;
  if (pideFichas(pedido)) return refs.some((r) => esHrefFicha(r.href));
  return listaCortaDeEntidades(refs);
}

/** Hasta 6 fichas si pidió tarjetas; si no, hasta 4 de entidad. */
export function fichasVisibles(
  pedido: string,
  refs: readonly ReferenciaEntidad[],
): ReferenciaEntidad[] {
  const deFicha = refs.filter((r) => esHrefFicha(r.href));
  if (pideFichas(pedido)) return deFicha.slice(0, 6);
  if (listaCortaDeEntidades(refs)) return [...refs];
  if (refs.length <= 4) return [...refs];
  return deFicha.slice(0, 4);
}

/** Quita viñetas que solo repiten fichas (mensajes viejos o sin post-proceso). */
export function textoRespaldoFichas(texto: string, refs: readonly ReferenciaEntidad[]): string {
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
