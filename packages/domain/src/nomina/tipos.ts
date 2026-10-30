// Vocabulario de Nómina (Brief 25, nomina.md). Constantes de dominio compartidas por esquema Zod,
// capacidades y pantallas; sin dependencias.

/** Estados del período de remuneraciones (nomina.md §6). */
export const ESTADOS_PERIODO = ["abierto", "en_revision", "cerrado", "pagado"] as const;
export type EstadoPeriodo = (typeof ESTADOS_PERIODO)[number];

/** Tipos de novedad del período (diseño 05). */
export const TIPOS_NOVEDAD = [
  "licencia",
  "ausencia",
  "horas_extra",
  "anticipo",
  "prestamo",
  "descuento",
] as const;
export type TipoNovedad = (typeof TIPOS_NOVEDAD)[number];

/** Quién originó la novedad: una persona, la carga masiva o una regla automática (B2, B3). */
export const ORIGENES_NOVEDAD = [
  "manual",
  "carga_masiva",
  "anticipo_quincenal",
  "prestamo_cuota",
] as const;
export type OrigenNovedad = (typeof ORIGENES_NOVEDAD)[number];

export const ESTADOS_NOVEDAD = ["vigente", "anulada"] as const;
export type EstadoNovedad = (typeof ESTADOS_NOVEDAD)[number];

/** Unidad que mide cada tipo de novedad: días, horas o pesos (CLP enteros). */
export const UNIDAD_NOVEDAD: Readonly<Record<TipoNovedad, "dias" | "horas" | "clp">> = {
  licencia: "dias",
  ausencia: "dias",
  horas_extra: "horas",
  anticipo: "clp",
  prestamo: "clp",
  descuento: "clp",
};

export const TIPOS_CONCEPTO = ["haber", "descuento"] as const;
export type TipoConcepto = (typeof TIPOS_CONCEPTO)[number];

/** Obligaciones del calendario (diseño 10): mensuales y anuales. Formatos y plazos por verificar. */
export const TIPOS_OBLIGACION = [
  "lre",
  "previred",
  "f29_retencion",
  "dj_sueldos",
  "certificado_sueldos",
] as const;
export type TipoObligacion = (typeof TIPOS_OBLIGACION)[number];

export const ESTADOS_OBLIGACION = [
  "por_generar",
  "generado",
  "con_errores",
  "cargado",
  "pagado",
] as const;
export type EstadoObligacion = (typeof ESTADOS_OBLIGACION)[number];

export const ESTADOS_PRESTAMO = ["activo", "pagado", "cancelado"] as const;
export type EstadoPrestamo = (typeof ESTADOS_PRESTAMO)[number];

export const ESTADOS_CUOTA = ["pendiente", "descontada", "condonada"] as const;
export type EstadoCuota = (typeof ESTADOS_CUOTA)[number];

export const MODOS_ANTICIPO = ["monto_fijo", "porcentaje_base"] as const;
export type ModoAnticipo = (typeof MODOS_ANTICIPO)[number];

export const MAX_CUOTAS_PRESTAMO = 60;
