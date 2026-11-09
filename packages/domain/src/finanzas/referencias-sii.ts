// Referencias de un DTE de venta (CAR-221 · A1): catálogo cerrado del SII que se ofrece al emitir una factura.
// Cada referencia lleva su folio y la fecha del documento referenciado (campo FchRef del XML).

export const REFERENCIAS_SII = [
  { codigo: 801, etiqueta: "Orden de compra" },
  { codigo: 802, etiqueta: "HES (hoja de entrada de servicio)" },
  { codigo: 803, etiqueta: "Contrato" },
  { codigo: 804, etiqueta: "Resolución" },
  { codigo: 52, etiqueta: "Guía de despacho" },
] as const;

export type CodigoReferenciaSii = (typeof REFERENCIAS_SII)[number]["codigo"];

export const CODIGOS_REFERENCIA_SII: readonly number[] = REFERENCIAS_SII.map((r) => r.codigo);

export const esReferenciaSii = (codigo: number): codigo is CodigoReferenciaSii =>
  CODIGOS_REFERENCIA_SII.includes(codigo);

export const etiquetaReferenciaSii = (codigo: number): string =>
  REFERENCIAS_SII.find((r) => r.codigo === codigo)?.etiqueta ?? `Documento ${codigo}`;

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida una referencia del catálogo: código permitido, folio entero positivo y fecha real que no sea posterior a
 * la emisión del documento que la cita. Devuelve el mensaje de error o null.
 */
export function validarReferenciaSii(
  r: { codigo: number; folio: number; fecha: string },
  fechaEmisionIso: string,
): string | null {
  if (!esReferenciaSii(r.codigo)) {
    return `La referencia ${r.codigo} no está en el catálogo del SII (${CODIGOS_REFERENCIA_SII.join(", ")}).`;
  }
  if (!Number.isInteger(r.folio) || r.folio < 1) return "El folio de la referencia debe ser un número positivo.";
  if (!FECHA_ISO.test(r.fecha) || Number.isNaN(Date.parse(`${r.fecha}T00:00:00Z`))) {
    return "La fecha de la referencia no es válida (AAAA-MM-DD).";
  }
  if (r.fecha > fechaEmisionIso.slice(0, 10)) return "La fecha de la referencia no puede ser posterior a la emisión.";
  return null;
}
