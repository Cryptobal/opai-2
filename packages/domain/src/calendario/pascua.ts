// Domingo de Resurrección (Pascua) en el calendario gregoriano por el algoritmo de computus de
// Gauss/Meeus (Jones-Butcher). De aquí salen el Viernes Santo (Pascua − 2) y el Sábado Santo
// (Pascua − 1), feriados religiosos de Chile. Lógica pura, sin tabla por año (CAR-79). Ref.:
// J. Meeus, «Astronomical Algorithms», cap. 8 (Easter).

import { iso } from "./fechas";

/** Domingo de Pascua (Resurrección) del año, gregoriano, como "aaaa-mm-dd" (UTC). */
export function domingoDePascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(new Date(Date.UTC(anio, mes - 1, dia)));
}
