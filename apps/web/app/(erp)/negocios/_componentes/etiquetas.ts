// Etiquetas de Comercial que comparten la ficha y las hojas (vocabulario de los vínculos).

export const TIPO_VINCULO: Record<string, string> = {
  nueva: "Nueva",
  ampliacion: "Ampliación",
  renovacion: "Renovación",
  reemplazo: "Reemplazo",
};

export const ROL_CONTACTO: Record<string, string> = {
  decisor: "Decisor",
  tecnico: "Técnico",
  compras: "Compras",
  usuario: "Usuario",
};

/** Opciones de un Select del DS a partir de un diccionario de etiquetas. */
export const opcionesDe = (m: Record<string, string>) =>
  Object.entries(m).map(([valor, etiqueta]) => ({ valor, etiqueta }));
