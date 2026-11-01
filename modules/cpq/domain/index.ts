// Dominio puro de CPQ (cpq.md §5): estados de la cotización (R40), correlativo `CPQ-AAAA-NNN` (R54)
// y validez por defecto. Sin Next, React ni base de datos; cada cálculo tiene su test.

/** Estados de una versión (R40; `archivada` es la propuesta para borradores abandonados). */
export const ESTADOS_COTIZACION = [
  "borrador",
  "en_aprobacion",
  "lista",
  "enviada",
  "aceptada",
  "rechazada",
  "vencida",
  "reemplazada",
  "archivada",
] as const;
export type EstadoCotizacion = (typeof ESTADOS_COTIZACION)[number];

/** «Abierta» = todavía puede cerrarse con el negocio (R40). */
export const ESTADOS_ABIERTOS: readonly EstadoCotizacion[] = [
  "borrador",
  "en_aprobacion",
  "lista",
  "enviada",
];

/** La única versión editable de un código vive en uno de estos estados (índice parcial en el SQL). */
export const ESTADOS_EDITABLES: readonly EstadoCotizacion[] = [
  "borrador",
  "en_aprobacion",
  "lista",
];

/**
 * Transiciones de cpq.md §6, incluidas las del sistema (vencer, aceptar, rechazar,
 * reemplazar) y la vuelta a borrador al editar (R41). `aceptada` y `rechazada` vuelven a `enviada`
 * solo si se reabre el negocio (R45); `vencida` y `reemplazada` son terminales (se renueva con una
 * versión nueva, R44).
 */
const TRANSICIONES: Readonly<Record<EstadoCotizacion, readonly EstadoCotizacion[]>> = {
  borrador: ["en_aprobacion", "lista", "archivada", "rechazada"],
  en_aprobacion: ["lista", "borrador", "rechazada"],
  lista: ["enviada", "borrador", "rechazada"],
  enviada: ["aceptada", "rechazada", "vencida", "reemplazada"],
  aceptada: ["enviada"],
  rechazada: ["enviada"],
  vencida: [],
  reemplazada: [],
  archivada: ["borrador"],
};

export function puedeTransicionar(desde: EstadoCotizacion, hasta: EstadoCotizacion): boolean {
  return TRANSICIONES[desde].includes(hasta);
}

export function esEditable(estado: EstadoCotizacion): boolean {
  return ESTADOS_EDITABLES.includes(estado);
}

/** Código `CPQ-AAAA-NNN`: el número lleva al menos tres dígitos y crece sin tope (R54). */
export function formatearCodigo(anio: number, numero: number): string {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 9999) throw new RangeError("Año inválido.");
  if (!Number.isInteger(numero) || numero < 1) throw new RangeError("Número inválido.");
  return `CPQ-${anio}-${String(numero).padStart(3, "0")}`;
}

/** Año calendario de `fecha` en la zona del tenant (por defecto Chile), no el del servidor (UTC). */
export function anioEnZona(fecha: Date, zona = "America/Santiago"): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric" }).format(fecha),
  );
}

/** Validez por defecto de una cotización nueva, en días (cpq.md pregunta 10). */
export const VALIDEZ_DIAS_DEFECTO = 30;

/** Fecha `YYYY-MM-DD` de hoy (en la zona) más `dias`, para «válida hasta». */
export function validaHastaPorDefecto(
  hoy: Date,
  dias = VALIDEZ_DIAS_DEFECTO,
  zona = "America/Santiago",
): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(hoy);
  const base = new Date(`${ymd}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}
