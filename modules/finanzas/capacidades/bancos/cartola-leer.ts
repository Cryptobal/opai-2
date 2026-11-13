import {
  ErrorCartola,
  parsearCartolaSantander,
  parsearCsvGenerico,
  validarTamanoCartola,
  type MapeoColumnasGenerico,
  type ResultadoCartola,
} from "@opai/domain";

import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { aFecha } from "./util";

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
    return { filas: r.filas, rechazadas: r.rechazadas, saldoFinal: null, fechaDesde: null, fechaHasta: null, cuadratura: null };
  } catch (e) {
    if (e instanceof ErrorCartola) throw reglaDeNegocio(e.message);
    throw e;
  }
}

export function mensajeDescuadre(diferencia: number): string {
  const monto = Math.abs(diferencia).toLocaleString("es-CL");
  return `La cartola no cuadra: saldo inicial + movimientos ${diferencia > 0 ? "supera" : "queda bajo"} el saldo final en $${monto}. No se importó nada; revisa el archivo.`;
}

/**
 * Cartola ya importada en la cuenta con el mismo período (CAR-341): volver a subirla solo deja duplicados y otra
 * fila en el historial. La vista previa lo avisa; el período de una consulta sin fechas no se compara.
 */
export async function cartolaRepetida(
  ctx: Contexto,
  cuentaId: string,
  desde: string | null,
  hasta: string | null,
): Promise<{ nombreArchivo: string | null; creadaEn: string } | null> {
  if (!desde || !hasta) return null;
  const previa = await ctx.db.cartolaImportada.findFirst({
    where: { cuentaId, fechaDesde: aFecha(desde), fechaHasta: aFecha(hasta) },
    orderBy: { createdAt: "desc" },
    select: { nombreArchivo: true, createdAt: true },
  });
  return previa ? { nombreArchivo: previa.nombreArchivo, creadaEn: previa.createdAt.toISOString() } : null;
}
