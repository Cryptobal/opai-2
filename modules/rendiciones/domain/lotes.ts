// Dominio puro de los lotes de pago (CAR-208, R3): estados, totales, unicidad y reglas de
// segregación. Sin base de datos, React ni Next (REGLAS-codigo). Dinero en CLP entero.

export const ESTADOS_LOTE = ["borrador", "aprobado", "generado", "pagado", "anulado", "aplicado"] as const;
export type EstadoLote = (typeof ESTADOS_LOTE)[number];

/**
 * Transiciones del lote de pago. «Pagado» se marca a mano con fecha y referencia; puede venir de «aprobado»
 * (pago por otro medio, sin archivo de nómina) o de «generado». Un lote pagado no se anula: la reversa
 * de un pago es un lote de reversa (CAR-614).
 */
const TRANSICIONES_PAGO: Readonly<Record<EstadoLote, readonly EstadoLote[]>> = {
  borrador: ["aprobado", "anulado"],
  aprobado: ["generado", "pagado", "anulado"],
  generado: ["pagado", "anulado"],
  pagado: [],
  anulado: [],
  aplicado: [],
};

/** Lote de reversa: borrador → aprobado → aplicado (revierte rendiciones pagadas a aprobadas). */
const TRANSICIONES_REVERSA: Readonly<Record<EstadoLote, readonly EstadoLote[]>> = {
  borrador: ["aprobado", "anulado"],
  aprobado: ["aplicado", "anulado"],
  aplicado: [],
  anulado: [],
  generado: [],
  pagado: [],
};

export function puedeTransitarLote(desde: EstadoLote, hacia: EstadoLote, esReversa = false): boolean {
  const mapa = esReversa ? TRANSICIONES_REVERSA : TRANSICIONES_PAGO;
  return (mapa[desde] ?? []).includes(hacia);
}

export const codigoLote = (n: number): string => `LP-${n}`;

/** Tope de rendiciones por lote (una nómina de transferencias razonable de revisar). */
const MAX_RENDICIONES_LOTE = 200;
/** Tope del total del lote: cabe en el entero de la base (CLP entero). */
const MAX_TOTAL_LOTE = 2_000_000_000;

export type RendicionParaLote = {
  id: string;
  estado: string;
  montoTotal: number;
  solicitanteId: string;
  /** Lote activo que ya la contiene, si existe. */
  loteActivoId?: string | null | undefined;
  conCuenta: boolean;
};

/** Total del lote: suma de las rendiciones, en CLP entero; el servidor lo calcula, nunca el cliente. */
export function totalLote(rendiciones: readonly { montoTotal: number }[]): number {
  return rendiciones.reduce((suma, r) => suma + r.montoTotal, 0);
}

/**
 * Valida la selección de un lote nuevo y devuelve los problemas (vacío = válida): sin duplicados,
 * todas aprobadas, ninguna en otro lote activo, con cuenta en la ficha y sin superar el tope.
 */
export function validarSeleccion(ids: readonly string[], encontradas: readonly RendicionParaLote[]): string[] {
  const problemas: string[] = [];
  if (ids.length === 0) problemas.push("Elige al menos una rendición.");
  if (new Set(ids).size !== ids.length) problemas.push("Una rendición está repetida en la selección.");
  if (ids.length > MAX_RENDICIONES_LOTE) problemas.push(`Un lote admite hasta ${MAX_RENDICIONES_LOTE} rendiciones.`);
  if (totalLote(encontradas) > MAX_TOTAL_LOTE) problemas.push("El total del lote supera el máximo permitido.");
  const porId = new Map(encontradas.map((r) => [r.id, r]));
  if (ids.some((id) => !porId.has(id))) problemas.push("Una rendición no existe.");
  for (const r of encontradas) {
    if (r.estado !== "aprobada") problemas.push("Solo se pagan rendiciones aprobadas.");
    if (r.loteActivoId) problemas.push("Una rendición ya está en otro lote activo.");
    if (!r.conCuenta) problemas.push("Una persona no tiene datos bancarios en su ficha.");
  }
  return [...new Set(problemas)];
}

/** Ninguna rendición del lote es de quien actúa: nadie crea, aprueba ni paga lo suyo (decisión 4-nov-2026). */
export function sinRendicionPropia(actorId: string, solicitantes: readonly string[]): boolean {
  return !solicitantes.includes(actorId);
}

export type RendicionParaReversa = { id: string; estado: string; montoTotal: number; solicitanteId: string; lotePagadoId: string | null; enReversaAbierta: boolean };

/** Valida la selección de un lote de reversa (rendiciones pagadas en un lote ya marcado pagado). */
export function validarSeleccionReversa(ids: readonly string[], encontradas: readonly RendicionParaReversa[]): string[] {
  const problemas: string[] = [];
  if (ids.length === 0) problemas.push("Elige al menos una rendición.");
  if (new Set(ids).size !== ids.length) problemas.push("Una rendición está repetida en la selección.");
  if (ids.length > MAX_RENDICIONES_LOTE) problemas.push(`Un lote admite hasta ${MAX_RENDICIONES_LOTE} rendiciones.`);
  const porId = new Map(encontradas.map((r) => [r.id, r]));
  if (ids.some((id) => !porId.has(id))) problemas.push("Una rendición no existe.");
  for (const r of encontradas) {
    if (r.estado !== "pagada") problemas.push("Solo se reversan rendiciones pagadas.");
    if (!r.lotePagadoId) problemas.push("Una rendición pagada no está en un lote pagado.");
    if (r.enReversaAbierta) problemas.push("Una rendición ya está en otro lote de reversa abierto.");
  }
  return [...new Set(problemas)];
}

/**
 * Quien crea el lote no es el único que lo aprueba. Si en la empresa solo una persona tiene el permiso
 * de aprobar lotes (y es quien lo creó), puede aprobarlo: es el caso de una sola persona, que queda
 * documentado y auditado. Si hay otra persona con el permiso, debe aprobar otra.
 */
export function puedeAprobarLote(creadoPorId: string, actorId: string, personasConPermiso: readonly string[]): boolean {
  if (actorId !== creadoPorId) return true;
  const otras = personasConPermiso.filter((p) => p !== actorId);
  return otras.length === 0;
}
