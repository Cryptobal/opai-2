// Cuándo se mandan la proforma y el estado de pago de una programación (CAR-221): al generar el borrador o en el día
// acordado con el cliente. Es independiente del día de generación, de la fecha de la factura y de la UF. Puro.

export const CUANDO_PREVIOS = ["generar", "fecha_acordada"] as const;
export type CuandoPrevios = (typeof CUANDO_PREVIOS)[number];

export const DIA_PREVIOS_MIN = 1;
export const DIA_PREVIOS_MAX = 31;

const ultimoDia = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();
const iso = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

/**
 * Fecha en que se mandan los previos de un borrador generado en `fechaGeneracion` (aaaa-mm-dd).
 * «generar» (o sin día) → ese mismo día. «fecha_acordada» → la primera vez que cae el día acordado desde la generación
 * (ese día si todavía no pasó; si no, el del mes siguiente). Un día que el mes no tiene (29, 30, 31) cae en su último día.
 */
export function fechaEnvioPrevios(fechaGeneracion: string, cuando: CuandoPrevios, dia: number | null): string {
  if (cuando === "generar" || dia === null) return fechaGeneracion;
  const [a, m, d] = fechaGeneracion.split("-").map(Number) as [number, number, number];
  const esteMes = Math.min(dia, ultimoDia(a, m));
  if (esteMes >= d) return iso(a, m, esteMes);
  const [a2, m2] = m === 12 ? [a + 1, 1] : [a, m + 1];
  return iso(a2, m2, Math.min(dia, ultimoDia(a2, m2)));
}
