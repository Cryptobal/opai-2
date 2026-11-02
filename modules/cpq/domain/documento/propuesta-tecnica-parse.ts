import {
  PLANTILLA_PROPUESTA_DEFECTO,
  TIPOS_BLOQUE_PROPUESTA,
  type BloqueArmadorPropuesta,
  type BloquePlantillaPropuesta,
} from "./propuesta-tecnica-tipos";

export { PLANTILLA_PROPUESTA_DEFECTO };

export function parseBloquesPlantillaPropuesta(json: string): BloquePlantillaPropuesta[] {
  try {
    const raw = JSON.parse(json) as BloquePlantillaPropuesta[];
    if (!Array.isArray(raw) || !raw.length) return PLANTILLA_PROPUESTA_DEFECTO;
    return raw.filter((b) => TIPOS_BLOQUE_PROPUESTA.includes(b.tipo));
  } catch {
    return PLANTILLA_PROPUESTA_DEFECTO;
  }
}

export function parseBloquesArmadorPropuesta(json: string): BloqueArmadorPropuesta[] {
  try {
    const raw = JSON.parse(json) as BloqueArmadorPropuesta[];
    if (!Array.isArray(raw)) return [];
    return raw.filter((b) => TIPOS_BLOQUE_PROPUESTA.includes(b.tipo));
  } catch {
    return [];
  }
}
