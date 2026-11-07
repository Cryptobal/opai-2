// Dominio puro de los lotes de pago (CAR-208, R3): estados, totales, unicidad y reglas de
// segregación. Sin base de datos, React ni Next (REGLAS-codigo). Dinero en CLP entero.

export const ESTADOS_LOTE = ["borrador", "aprobado", "generado", "pagado", "anulado"] as const;
export type EstadoLote = (typeof ESTADOS_LOTE)[number];

/**
 * Transiciones del lote. «Pagado» se marca a mano con fecha y referencia; puede venir de «aprobado»
 * (pago por otro medio, sin archivo de nómina) o de «generado». Un lote pagado no se anula: la
 * reversa de un pago es un lote de reversa (fuera de R3).
 */
const TRANSICIONES: Readonly<Record<EstadoLote, readonly EstadoLote[]>> = {
  borrador: ["aprobado", "anulado"],
  aprobado: ["generado", "pagado", "anulado"],
  generado: ["pagado", "anulado"],
  pagado: [],
  anulado: [],
};

export function puedeTransitarLote(desde: EstadoLote, hacia: EstadoLote): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/** Estados en que el lote retiene sus rendiciones (no pueden entrar a otro lote). */
export const esLoteActivo = (e: EstadoLote): boolean => e !== "anulado";

export const codigoLote = (n: number): string => `LP-${n}`;

/** Tope de rendiciones por lote (una nómina de transferencias razonable de revisar). */
export const MAX_RENDICIONES_LOTE = 200;
/** Tope del total del lote: cabe en el entero de la base (CLP entero). */
export const MAX_TOTAL_LOTE = 2_000_000_000;

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
