import type { FinalidadCampo } from "./tipos";

/** Grupos de finalidades que se repiten en el catálogo. */
export const TODAS: readonly FinalidadCampo[] = ["propuesta", "contrato", "documento", "correo"];
export const SIN_PROPUESTA: readonly FinalidadCampo[] = ["contrato", "documento", "correo"];
export const SOLO_CONTRATO: readonly FinalidadCampo[] = ["contrato"];
