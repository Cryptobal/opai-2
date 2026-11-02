// Libro de ventas · emisión DTE (CAR-137, Brief 22). Lógica pura; sin Prisma ni red.

/** Tipos de DTE que emite Ventas en PR 1 (nota de débito 56 queda para PR posterior). */
export const TIPOS_DTE_VENTA = [33, 34, 61] as const;
export type TipoDteVenta = (typeof TIPOS_DTE_VENTA)[number];

export const NOMBRE_TIPO_DTE_VENTA: Readonly<Record<TipoDteVenta, string>> = {
  33: "Factura electrónica",
  34: "Factura exenta electrónica",
  61: "Nota de crédito electrónica",
};

/** Ciclo del documento ante el SII. */
export const ESTADOS_DTE_EMITIDO = [
  "borrador",
  "enviado",
  "aceptado",
  "rechazado",
  "anulado_nc",
] as const;
export type EstadoDteEmitido = (typeof ESTADOS_DTE_EMITIDO)[number];

/** Cobro básico en PR 1 (conciliación bancaria refina en PR posterior). */
export const ESTADOS_COBRO_VENTA = ["pendiente", "pagada_parcial", "pagada"] as const;
export type EstadoCobroVenta = (typeof ESTADOS_COBRO_VENTA)[number];

/** Ambiente del adaptador SII; producción solo con ajuste explícito del tenant. */
export const AMBIENTES_SII = ["certificacion", "produccion"] as const;
export type AmbienteSii = (typeof AMBIENTES_SII)[number];

/** Códigos de referencia habituales para nota de crédito (SII). */
export const CODIGOS_REFERENCIA_NC = [1, 2, 3] as const;
export type CodigoReferenciaNc = (typeof CODIGOS_REFERENCIA_NC)[number];

export type MontosDteVenta = {
  neto: number;
  exento: number;
  iva: number;
  otros: number;
  total: number;
};

/** IVA 19 % sobre neto (enteros CLP). */
export function ivaDesdeNeto(neto: number): number {
  return Math.round(neto * 0.19);
}

/** Valida montos y coherencia tipo 33 vs 34 (afecta vs exenta). */
export function validarMontosVenta(tipo: TipoDteVenta, m: MontosDteVenta): string | null {
  for (const v of Object.values(m)) {
    if (!Number.isInteger(v) || v < 0 || v > 2_000_000_000)
      return "Los montos deben ser pesos enteros, de 0 a 2.000.000.000.";
  }
  const suma = m.neto + m.exento + m.iva + m.otros;
  if (suma !== m.total) return `El total (${m.total}) no cuadra con neto + exento + IVA + otros (${suma}).`;
  if (tipo === 34 && (m.neto !== 0 || m.iva !== 0))
    return "La factura exenta (34) no lleva neto ni IVA; use monto exento.";
  if (tipo === 33 && m.exento !== 0) return "La factura afecta (33) no lleva monto exento.";
  if (tipo === 33 && m.iva !== ivaDesdeNeto(m.neto))
    return `El IVA debe ser 19 % del neto (${ivaDesdeNeto(m.neto)}).`;
  if (tipo === 61 && m.total <= 0) return "La nota de crédito debe tener un monto positivo.";
  return null;
}

/** Transiciones permitidas del estado SII. */
export function puedeTransicionDte(de: EstadoDteEmitido, a: EstadoDteEmitido): boolean {
  if (de === a) return false;
  switch (de) {
    case "borrador":
      return a === "enviado";
    case "enviado":
      return a === "aceptado" || a === "rechazado";
    case "aceptado":
      return a === "anulado_nc";
    default:
      return false;
  }
}

/** Porcentaje del rango CAF bajo el cual avisar folios por agotarse (R-FIN-038). */
export const UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO = 20;

/** Días de anticipación por defecto para avisar vencimiento del CAF vigente. */
export const AVISO_CAF_DIAS_DEFECTO = 30;

/** Folios restantes en un rango autorizado (inclusive). */
export function foliosRestantes(folioActual: number, folioHasta: number): number {
  return Math.max(0, folioHasta - folioActual + 1);
}

/** Cantidad de folios que corresponde al umbral porcentual del rango (mínimo 1 si el rango tiene folios). */
export function umbralFoliosDesdePct(folioDesde: number, folioHasta: number, pct: number): number {
  const total = Math.max(0, folioHasta - folioDesde + 1);
  if (total === 0) return 0;
  const p = Math.min(100, Math.max(1, pct));
  return Math.max(1, Math.ceil((total * p) / 100));
}

export function foliosPorAgotarse(restantes: number, umbral: number): boolean {
  return restantes > 0 && restantes <= umbral;
}

/** true si la fecha de vencimiento del CAF (YYYY-MM-DD) es anterior a hoy. */
export function cafVencido(cafVenceEn: string | null | undefined, hoyIso: string): boolean {
  if (!cafVenceEn) return false;
  return cafVenceEn < hoyIso;
}

/** true si el CAF vence dentro de `diasAntes` días (inclusive), contando desde hoy. */
export function cafPorVencer(cafVenceEn: string | null | undefined, hoyIso: string, diasAntes: number): boolean {
  if (!cafVenceEn || diasAntes < 1) return false;
  if (cafVenceEn < hoyIso) return false;
  const limite = sumarDiasIso(hoyIso, diasAntes);
  return cafVenceEn <= limite;
}

function sumarDiasIso(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
