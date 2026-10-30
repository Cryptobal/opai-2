// Estados de una versión de cotización (cpq.md R40, §6). Lógica pura: sin base ni framework.

/** Estado único de una versión (R40, ADR-042 (7)); `archivada` para borradores abandonados. */
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

/** «Abierta» = borrador, en aprobación, lista o enviada (R40). */
export const ESTADOS_ABIERTOS: readonly EstadoCotizacion[] = [
  "borrador",
  "en_aprobacion",
  "lista",
  "enviada",
];

/** Estados en que la versión se puede editar; editar una aprobada o lista vuelve a borrador (R41). */
export const ESTADOS_EDITABLES: readonly EstadoCotizacion[] = ["borrador", "en_aprobacion", "lista"];

/** Transiciones permitidas de §6. `enviada → (v+1) borrador` crea otra versión, no cambia esta. */
const TRANSICIONES: Readonly<Record<EstadoCotizacion, readonly EstadoCotizacion[]>> = {
  borrador: ["lista", "en_aprobacion", "rechazada", "archivada"],
  en_aprobacion: ["lista", "borrador", "rechazada"],
  lista: ["enviada", "borrador", "rechazada"],
  enviada: ["vencida", "aceptada", "rechazada", "reemplazada"],
  aceptada: ["enviada"],
  rechazada: [],
  vencida: [],
  reemplazada: [],
  archivada: ["borrador"],
};

export function puedeTransicionar(de: EstadoCotizacion, a: EstadoCotizacion): boolean {
  return TRANSICIONES[de].includes(a);
}

export function esEditable(estado: EstadoCotizacion): boolean {
  return ESTADOS_EDITABLES.includes(estado);
}

/**
 * Estado tras editar una versión editable (R41): toda edición de una versión en aprobación o lista
 * la devuelve a borrador; la aprobación valía solo para esa versión y su venta.
 */
export function estadoTrasEditar(estado: EstadoCotizacion): EstadoCotizacion {
  if (!esEditable(estado)) throw new Error(`Una versión ${estado} no se edita.`);
  return "borrador";
}
