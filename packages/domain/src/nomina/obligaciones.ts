import type { EstadoObligacion, TipoObligacion } from "./tipos";

/** Obligaciones que se repiten cada mes de remuneraciones. */
export const OBLIGACIONES_MENSUALES: readonly TipoObligacion[] = ["lre", "previred", "f29_retencion"];

/** Obligaciones anuales (año tributario siguiente a las remuneraciones). */
export const OBLIGACIONES_ANUALES: readonly TipoObligacion[] = ["dj_sueldos", "certificado_sueldos"];

export const ETIQUETA_OBLIGACION: Readonly<Record<TipoObligacion, string>> = {
  lre: "Libro de Remuneraciones Electrónico (LRE)",
  previred: "Previred",
  f29_retencion: "Retención de impuesto único (F29)",
  dj_sueldos: "Declaración Jurada de sueldos",
  certificado_sueldos: "Certificado de sueldos",
};

/**
 * Avance de una obligación. `generado` y `con_errores` los fija el generador de archivos (PR 2);
 * quien registra el comprobante de carga o de pago lo hace a mano. Se puede volver a `por_generar`
 * para regenerar, y un archivo con errores se regenera.
 */
const TRANSICIONES: Readonly<Record<EstadoObligacion, readonly EstadoObligacion[]>> = {
  por_generar: ["generado", "con_errores", "cargado", "pagado"],
  generado: ["con_errores", "cargado", "pagado", "por_generar"],
  con_errores: ["generado", "por_generar"],
  cargado: ["pagado", "por_generar"],
  pagado: [],
};

export function transicionObligacionValida(de: EstadoObligacion, a: EstadoObligacion): boolean {
  return TRANSICIONES[de].includes(a);
}

export function esMensual(tipo: TipoObligacion): boolean {
  return OBLIGACIONES_MENSUALES.includes(tipo);
}

/**
 * Claves del calendario de un año de remuneraciones: 12 meses × obligaciones mensuales y, una vez, las
 * anuales (sin mes). El plazo no se calcula: lo fija quien lo verifica (`plazoVerificado`).
 */
export function clavesCalendarioAnio(anio: number): { tipo: TipoObligacion; anio: number; mes: number | null }[] {
  const claves: { tipo: TipoObligacion; anio: number; mes: number | null }[] = [];
  for (let mes = 1; mes <= 12; mes++)
    for (const tipo of OBLIGACIONES_MENSUALES) claves.push({ tipo, anio, mes });
  for (const tipo of OBLIGACIONES_ANUALES) claves.push({ tipo, anio, mes: null });
  return claves;
}

/** El plazo solo se muestra si está verificado; si no, «Plazo por verificar» (decisión de Carlos 4). */
export function plazoVisible(o: { fechaLimite: string | null; plazoVerificado: boolean }): string | null {
  return o.plazoVerificado && o.fechaLimite ? o.fechaLimite : null;
}
