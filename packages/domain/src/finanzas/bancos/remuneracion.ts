const PATRON_REM = /\bREMUNERACI(O|Ó)N\b/i;
const PATRON_PREV = /\bPREVIRED\b/i;

export function esRemuneracion(glosa: string): boolean {
  return PATRON_REM.test(glosa) || PATRON_PREV.test(glosa);
}

export function etiquetaFlujoRemuneracion(glosa: string): "Guardias" | "Previred" {
  return PATRON_PREV.test(glosa) ? "Previred" : "Guardias";
}
