// Días hábiles = lunes a viernes menos los feriados del ámbito (modulos/seguimiento-comercial.md:24).
// El ámbito es el conjunto de fechas de feriado ya resuelto para la instalación. Lógica pura.

import { diaUtc, esFinDeSemana, iso, sumarDias } from "./fechas";

/** Conjunto de feriados (aaaa-mm-dd) que definen un ámbito para el cálculo de días hábiles. */
export type AmbitoHabil = ReadonlySet<string>;

/** Un día es hábil si es de lunes a viernes y no es feriado del ámbito. */
export function esHabil(fecha: string, ambito: AmbitoHabil): boolean {
  return !esFinDeSemana(fecha) && !ambito.has(fecha);
}

/**
 * Días hábiles entre dos fechas, ambas inclusive (desde ≤ hasta). Si desde > hasta devuelve 0.
 * Un feriado que cae en fin de semana no descuenta dos veces: ya no era hábil.
 */
export function diasHabilesEntre(desde: string, hasta: string, ambito: AmbitoHabil): number {
  const fin = diaUtc(hasta).getTime();
  let cursor = diaUtc(desde).getTime();
  let n = 0;
  while (cursor <= fin) {
    if (esHabil(iso(new Date(cursor)), ambito)) n += 1;
    cursor += 86_400_000;
  }
  return n;
}

/**
 * Suma `dias` hábiles a `fecha` avanzando (o retrocediendo, si es negativo) de día en día y contando
 * solo los hábiles. Con `dias` = 0 devuelve la misma fecha, sea hábil o no.
 */
export function sumarDiasHabiles(fecha: string, dias: number, ambito: AmbitoHabil): string {
  diaUtc(fecha); // valida el formato
  const paso = dias < 0 ? -1 : 1;
  let restan = Math.abs(dias);
  let cursor = fecha;
  while (restan > 0) {
    cursor = sumarDias(cursor, paso);
    if (esHabil(cursor, ambito)) restan -= 1;
  }
  return cursor;
}
