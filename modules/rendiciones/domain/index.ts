// Dominio puro de Rendiciones (CAR-175, R1): estados, transiciones y reglas sin base de datos.
// No importa next, react ni @opai/db (REGLAS-codigo).

export const ESTADOS = ["borrador", "enviada", "aprobada", "rechazada", "devuelta", "pagada", "anulada"] as const;
export type EstadoRendicion = (typeof ESTADOS)[number];

/** Transiciones válidas. «Pagada» la marca el lote de pago confirmado (R3), no una capacidad de R1. */
const TRANSICIONES: Readonly<Record<EstadoRendicion, readonly EstadoRendicion[]>> = {
  borrador: ["enviada", "anulada"],
  devuelta: ["enviada", "anulada"],
  enviada: ["aprobada", "rechazada", "devuelta", "anulada"],
  aprobada: ["pagada"],
  rechazada: [],
  pagada: [],
  anulada: [],
};

export function puedeTransitar(desde: EstadoRendicion, hacia: EstadoRendicion): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/** Solo un borrador o una rendición devuelta se edita; lo enviado o decidido queda congelado. */
export function esEditable(estado: EstadoRendicion): boolean {
  return estado === "borrador" || estado === "devuelta";
}

/** Los adjuntos se borran solo mientras la rendición sigue editable (mejora respecto de 1.0). */
export const puedeBorrarAdjuntos = esEditable;

export function codigoVisible(codigo: number): string {
  return `REN-${codigo}`;
}

export type ItemRendicion = {
  fecha: string;
  proveedor: string;
  folio?: string | null | undefined;
  descripcion: string;
  monto: number;
  tieneRespaldo: boolean;
  sinRespaldoMotivo?: string | null | undefined;
};

/** Total en CLP entero; los montos del ítem ya son enteros positivos. */
export function totalRendicion(items: readonly { monto: number }[]): number {
  return items.reduce((suma, i) => suma + i.monto, 0);
}

/** Clave para detectar la misma boleta rendida dos veces: proveedor + folio + monto (sin tildes ni mayúsculas). */
export function claveDuplicado(i: { proveedor: string; folio?: string | null | undefined; monto: number }): string | null {
  const folio = (i.folio ?? "").trim();
  if (folio === "") return null;
  const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  return `${norm(i.proveedor)}|${norm(folio)}|${i.monto}`;
}

/** Ítems sin respaldo ni motivo, cuando la empresa exige respaldo (índices base 0). */
export function itemsSinRespaldo(items: readonly ItemRendicion[], exigirRespaldo: boolean): number[] {
  if (!exigirRespaldo) return [];
  return items.flatMap((i, n) => (!i.tieneRespaldo && !(i.sinRespaldoMotivo ?? "").trim() ? [n] : []));
}

/** La fecha del gasto (AAAA-MM-DD) no puede ser posterior a hoy (fecha del día en la zona del tenant). */
export function esFechaFutura(fecha: string, hoy: string): boolean {
  return fecha > hoy;
}

/** El solicitante nunca decide ni paga su propia rendición (decisión de Carlos, 4-nov-2026). */
export function puedeDecidir(solicitanteId: string, actorId: string, aprobadorId: string | null): boolean {
  return actorId !== solicitanteId && aprobadorId === actorId;
}
export * from "./kilometraje";
