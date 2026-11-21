export const ALCANCES_LISTA = ["empresa", "cuenta", "instalacion", "grupo"] as const;
export type AlcanceLista = (typeof ALCANCES_LISTA)[number];

/** Renovación de bloqueos (control-acceso §4.2, P2): 12 meses por defecto. */
export const MESES_VIGENCIA_BLOQUEO = 12;