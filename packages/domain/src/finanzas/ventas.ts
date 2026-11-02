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

/** Umbral por defecto para avisar folios por agotarse. */
export const UMBRAL_FOLIOS_BAJOS_DEFECTO = 10;

/** Folios restantes en un rango autorizado (inclusive). */
export function foliosRestantes(folioActual: number, folioHasta: number): number {
  return Math.max(0, folioHasta - folioActual + 1);
}

export function foliosPorAgotarse(restantes: number, umbral: number): boolean {
  return restantes > 0 && restantes <= umbral;
}

/** Estados de cesión (factoring/AEC) reservados para PR 2; sin lógica en PR 1. */
export const ESTADOS_CESION = ["pendiente", "cedida", "cobrada"] as const;
export type EstadoCesion = (typeof ESTADOS_CESION)[number];
