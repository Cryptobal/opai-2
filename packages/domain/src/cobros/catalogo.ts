/**
 * Catálogo del cobro por módulo (ADR-071 y su adenda del 4-nov-2026): monedas, formas de cobro,
 * unidades que se cuentan cada mes y motivos por los que un módulo se factura o no.
 */

export const MONEDAS_COBRO = ["CLP", "UF"] as const;
export type MonedaCobro = (typeof MONEDAS_COBRO)[number];

/** Precio fijo mensual, o precio por unidad × cantidad del mes (con mínimo opcional). */
export const FORMAS_COBRO = ["fijo", "por_unidad"] as const;
export type FormaCobro = (typeof FORMAS_COBRO)[number];

/**
 * Unidades que se cuentan al generar el cargo (referencia de Carlos, 4-nov-2026): Rendiciones por
 * usuario que rinde (los aprobadores no se cobran); Nómina, Asistencia y Cumplimiento DT por
 * trabajador activo; Operaciones por instalación activa; Comercial y CPQ por usuario con licencia.
 */
export const UNIDADES_COBRO = {
  usuario_activo: { singular: "usuario activo", plural: "usuarios activos" },
  usuario_rinde: { singular: "usuario que rinde", plural: "usuarios que rinden" },
  usuario_licencia: { singular: "usuario con licencia", plural: "usuarios con licencia" },
  trabajador_activo: { singular: "trabajador activo", plural: "trabajadores activos" },
  instalacion_activa: { singular: "instalación activa", plural: "instalaciones activas" },
} as const;
export type UnidadCobro = keyof typeof UNIDADES_COBRO;
export const esUnidadCobro = (u: string): u is UnidadCobro => u in UNIDADES_COBRO;

/** Id reservado del plan base mensual de la empresa (no es un módulo del registro). */
export const PLAN_BASE = "base";

/** Por qué un módulo se factura o no en un mes. */
export const MOTIVOS_COBRO = {
  factura: "Se factura",
  sin_condicion: "Sin condición comercial",
  sin_inicio: "Sin fecha de inicio del cobro",
  modulo_inactivo: "Módulo no contratado o suspendido",
  en_prueba: "En prueba",
  prueba_vencida: "Prueba vencida sin pasar a cobro (solo lectura)",
  cobro_futuro: "El cobro empieza después",
  sin_cantidad: "Falta contar las unidades del mes",
  bonificado: "Sin costo este mes",
} as const;
export type MotivoCobro = keyof typeof MOTIVOS_COBRO;

export type CondicionCobro = {
  moneda: MonedaCobro;
  forma: FormaCobro;
  /** Unidad que se cuenta (solo `por_unidad`). */
  unidad: UnidadCobro | null;
  /** Precio mensual (`fijo`) o por unidad (`por_unidad`): pesos o UF × 10.000. */
  precio: number;
  /** Mínimo mensual (misma escala que el precio); null: sin mínimo. */
  minimoMensual: number | null;
  /** Día (aaaa-mm-dd) desde el que se cobra; null: al terminar la prueba si pasa a cobro. */
  cobroDesde: string | null;
  /** Último día de la prueba (aaaa-mm-dd). */
  pruebaHasta: string | null;
  /** Al vencer la prueba: true se empieza a cobrar al día siguiente; false queda en solo lectura. */
  pasaACobro: boolean;
  /** Descuento en `PCT_ESCALA` (100 % = 1.000.000), después del mínimo. */
  descuentoPct: number;
};

export type CargoCalculado = {
  facturable: boolean;
  motivo: MotivoCobro;
  /** Primer día cobrado del mes, si se factura. */
  desde: string | null;
  diasCobrados: number;
  diasMes: number;
  /** Unidades contadas (solo `por_unidad`). */
  cantidad: number | null;
  /** Monto del mes completo (precio o cantidad × precio, con el mínimo), antes de prorratear. */
  mensual: number;
  /** Proporcional a los días cobrados, antes del descuento. */
  bruto: number;
  descuento: number;
  /** Monto a facturar en la moneda de la condición (pesos o UF × 10.000). */
  monto: number;
};

const PERIODO = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Primer y último día (aaaa-mm-dd) de un período aaaa-mm, y sus días. */
export function limitesDelPeriodo(periodo: string) {
  const m = PERIODO.exec(periodo);
  if (!m) throw new RangeError(`Período inválido: ${periodo}`);
  const dias = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return { inicio: `${periodo}-01`, fin: `${periodo}-${String(dias).padStart(2, "0")}`, dias };
}

/** Día siguiente a una fecha aaaa-mm-dd. */
export function diaSiguiente(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
