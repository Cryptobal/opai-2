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
  return Math.round(n * 100);
}

function diasEnMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
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

/** UF del SII para `fecha` (aaaa-mm-dd): el día indicado o el último día anterior con valor en la tabla. */
export function ufCentavosDelDia(html: string, fecha: string): number | null {
  const partes = fecha.split("-").map(Number);
  const y0 = partes[0];
  const m0 = partes[1];
  const d0 = partes[2];
  if (!y0 || !m0 || !d0) return null;
  let y = y0;
  let m = m0;
  let d = d0;
  for (let i = 0; i < 400; i += 1) {
    const section = seccionMesUf(html, m);
    if (section) {
      const v = ufCentavosEnDia(section, d);
      if (v != null) return v;
    }
    d -= 1;
    if (d < 1) {
      m -= 1;
      if (m < 1) {
        y -= 1;
        m = 12;
      }
      d = diasEnMes(y, m);
    }
    if (y < 2000) return null;
  }
  return null;
}

/** UTM en pesos del mes calendario (`mes` 1–12) según la tabla anual del SII. */
export function utmClpDelMes(html: string, mes: number): number | null {
  const nombre = MESES_UTM[mes - 1];
  if (!nombre) return null;
  const re = new RegExp(`<th>\\s*${nombre}\\s*</th>\\s*<td>\\s*([\\d.]+)\\s*</td>`, "i");
  const m = html.match(re);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) ? n : null;
}

export function primerDiaMes(fecha: string): string {
  const [y, m] = fecha.split("-");
  return `${y}-${m}-01`;
}
