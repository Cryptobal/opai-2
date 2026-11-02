/** Parseo de las tablas oficiales UF/UTM publicadas en www.sii.cl (valores_y_fechas). */

const MESES_ID = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const MESES_UTM = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function urlSiiUf(anio: number): string {
  return `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`;
}

export function urlSiiUtm(anio: number): string {
  return `https://www.sii.cl/valores_y_fechas/utm/utm${anio}.htm`;
}

export function ufTextoACentavos(texto: string): number | null {
  const m = texto.match(/^[\d.]+,\d{2}$/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const centavos = Math.round(n * 100);
  return centavos >= 1 ? centavos : null;
}

function seccionMesUf(html: string, mes: number): string | null {
  const id = MESES_ID[mes - 1];
  if (!id) return null;
  const inicio = html.search(new RegExp(`id='mes_${id}'`, "i"));
  if (inicio < 0) return null;
  const resto = html.slice(inicio);
  const siguiente = resto.search(/<div class='meses' id='mes_/i);
  return siguiente > 0 ? resto.slice(0, siguiente) : resto;
}

function ufCentavosEnDia(section: string, dia: number): number | null {
  const re = new RegExp(
    `<th[^>]*>\\s*<strong>\\s*${dia}\\s*</strong>\\s*</th>\\s*<td[^>]*>\\s*([^<]*?)\\s*</td>`,
    "i",
  );
  const m = section.match(re);
  if (!m?.[1]?.trim()) return null;
  return ufTextoACentavos(m[1].trim());
}

/** UF del SII solo para el día exacto de `fecha` (aaaa-mm-dd); sin retroceder días. */
export function ufCentavosDelDia(html: string, fecha: string): number | null {
  const partes = fecha.split("-").map(Number);
  const y = partes[0];
  const m = partes[1];
  const d = partes[2];
  if (!y || !m || !d) return null;
  const section = seccionMesUf(html, m);
  if (!section) return null;
  return ufCentavosEnDia(section, d);
}

/** UTM en pesos del mes calendario (`mes` 1–12) según la tabla anual del SII. */
export function utmClpDelMes(html: string, mes: number): number | null {
  const nombre = MESES_UTM[mes - 1];
  if (!nombre) return null;
  const re = new RegExp(`<th>\\s*${nombre}\\s*</th>\\s*<td>\\s*([\\d.]+)\\s*</td>`, "i");
  const m = html.match(re);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function primerDiaMes(fecha: string): string {
  const [y, m] = fecha.split("-");
  return `${y}-${m}-01`;
}

/** Resta días calendario a una fecha aaaa-mm-dd (sin depender de la TZ del runtime). */
export function restarDiasCivil(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const t = Date.UTC(y!, m! - 1, d! - dias);
  return new Date(t).toISOString().slice(0, 10);
}

/** Primer día del mes calendario anterior a `fecha` (aaaa-mm-dd). */
export function primerDiaMesAnterior(fecha: string): string {
  const [y, m] = fecha.split("-").map(Number);
  const mes = m === 1 ? 12 : m! - 1;
  const anio = m === 1 ? y! - 1 : y!;
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}
