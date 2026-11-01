// Libro de compras (finanzas-compras.md §5). Lógica pura de documentos recibidos.

/** Tipos de DTE que entran al libro de compras (extraccion-finanzas.md §1; boletas solo en el libro IVA). */
export const TIPOS_DTE_COMPRA = [33, 34, 56, 61] as const;
export type TipoDteCompra = (typeof TIPOS_DTE_COMPRA)[number];

export const NOMBRE_TIPO_DTE: Readonly<Record<TipoDteCompra, string>> = {
  33: "Factura",
  34: "Factura exenta",
  56: "Nota de débito",
  61: "Nota de crédito",
};

/** Estado de recepción ante el SII. Cambiarlo exige el adaptador RCV (pendiente, requiere credenciales). */
export const ESTADOS_RECEPCION = ["pendiente_revision", "aceptado", "reclamado"] as const;
export type EstadoRecepcion = (typeof ESTADOS_RECEPCION)[number];

/** Una nota de crédito resta del libro; los montos se guardan siempre positivos. */
export const signoDte = (tipo: TipoDteCompra): 1 | -1 => (tipo === 61 ? -1 : 1);

/** Tope de un monto CLP en la columna entera de la base (2.147.483.647). */
export const MONTO_CLP_MAX = 2_000_000_000;

export type MontosDte = {
  neto: number;
  exento: number;
  iva: number;
  otrosImpuestos: number;
  total: number;
};

/** El total debe ser neto + exento + IVA + otros impuestos (enteros CLP). Devuelve el error o null. */
export function validarMontos(m: MontosDte): string | null {
  for (const v of Object.values(m)) {
    if (!Number.isInteger(v) || v < 0 || v > MONTO_CLP_MAX)
      return "Los montos deben ser pesos enteros, de 0 a 2.000.000.000.";
  }
  const suma = m.neto + m.exento + m.iva + m.otrosImpuestos;
  if (suma !== m.total)
    return `El total (${m.total}) no cuadra con neto + exento + IVA + otros impuestos (${suma}).`;
  return null;
}

/** Plazo legal para reclamar el contenido de un DTE recibido: 8 días corridos (Ley 19.983; por verificar con el contador). */
export const PLAZO_RECLAMO_DIAS = 8;

const MS_DIA = 86_400_000;
const aMs = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const aDia = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Último día para aceptar o reclamar, desde la fecha de recepción ("aaaa-mm-dd"). */
export const venceReclamo = (fechaRecepcion: string): string =>
  aDia(aMs(fechaRecepcion) + PLAZO_RECLAMO_DIAS * MS_DIA);

/** Días que quedan (negativo = vencido) hasta el plazo de aceptar o reclamar, contados desde `hoy`. */
export const diasParaReclamo = (fechaRecepcion: string, hoy: string): number =>
  Math.round((aMs(venceReclamo(fechaRecepcion)) - aMs(hoy)) / MS_DIA);

/** Período contable "aaaa-mm" de una fecha "aaaa-mm-dd". */
export const periodoDe = (dia: string): string => dia.slice(0, 7);

/** Primer día del mes siguiente, para acotar un período con `< fin`. */
export function finDePeriodo(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Plazo de pago de un proveedor: vencimiento de una compra a partir de su fecha de emisión. */
export const vencimientoPago = (fechaEmision: string, plazoPagoDias: number): string =>
  aDia(aMs(fechaEmision) + plazoPagoDias * MS_DIA);
