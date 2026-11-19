/** Reglas compartidas agente ↔ UI para fichas (CAR-523). */

export function esHrefFicha(href: string): boolean {
  return /^\/(cuentas|personas|negocios|cotizaciones|finanzas\/ventas)\/[^/]+$/i.test(href);
}

export function pideFichas(texto: string): boolean {
  return /\b(tarjeta|tarjetas|ficha|fichas)\b/i.test(texto);
}

export function listaCortaDeEntidades(refs: readonly { href: string }[]): boolean {
  return refs.length >= 1 && refs.length <= 4 && refs.every((r) => esHrefFicha(r.href));
}

export function debeDibujarFichas(pedido: string, refs: readonly { href: string }[]): boolean {
  if (!refs.length) return false;
  if (pideFichas(pedido)) return refs.some((r) => esHrefFicha(r.href));
  return listaCortaDeEntidades(refs);
}

/** Quita viñetas que solo repiten las fichas; deja prosa corta como respaldo. */
export function textoRespaldoFichas(
  texto: string,
  refs: readonly { titulo: string; href: string }[],
): string {
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