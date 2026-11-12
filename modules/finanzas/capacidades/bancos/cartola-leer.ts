import {
  ErrorCartola,
  parsearCartolaSantander,
  parsearCsvGenerico,
  validarTamanoCartola,
  type MapeoColumnasGenerico,
  type ResultadoCartola,
} from "@opai/domain";

import { reglaDeNegocio } from "@opai/capabilities";

/**
 * Lee la cartola según su formato. Una falla de lectura o de forma (archivo que no abre, sin encabezado del
 * detalle, demasiado grande) sale como error de negocio con su motivo, nunca como INTERNAL (CAR-327).
 */
export async function leerCartola(
  buf: Buffer,
  formato: "santander" | "generico",
  mapeo: MapeoColumnasGenerico | null,
): Promise<ResultadoCartola> {
  try {
    validarTamanoCartola(buf.byteLength);
    if (formato === "santander") return await parsearCartolaSantander(buf);
    if (!mapeo) throw reglaDeNegocio("Indica el mapeo de columnas o guárdalo en la cuenta.");
    const r = parsearCsvGenerico(buf.toString("utf8"), mapeo);
    return { filas: r.filas, rechazadas: r.rechazadas, saldoFinal: null, fechaDesde: null, fechaHasta: null };
  } catch (e) {
    if (e instanceof ErrorCartola) throw reglaDeNegocio(e.message);
    throw e;
  }
}
