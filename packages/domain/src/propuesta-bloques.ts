/** Nombre de cada bloque de la propuesta técnica: el mismo en el armador y como título en el documento. */
export const NOMBRES_BLOQUE_PROPUESTA: Readonly<Record<string, string>> = {
  portada: "Portada",
  indice: "Índice",
  seccion_institucional: "Quiénes somos",
  comprension_servicio: "Comprensión del servicio",
  detalle_servicio: "Detalle del servicio",
  resumen_economico: "Resumen económico",
  condiciones: "Condiciones comerciales",
  incluye_exclusiones: "Qué incluye y qué no incluye",
  metodologia: "Metodología de trabajo",
  contacto_ejecutivo: "Su ejecutivo comercial",
  certificaciones: "Certificaciones",
  clientes_referencia: "Clientes de referencia",
  texto_libre: "Información adicional",
  salto_pagina: "Salto de página",
};

/** Bloques que salen del CPQ, la marca o la estructura: no llevan texto que la persona redacte. */
const SIN_TEXTO = new Set(["portada", "indice", "detalle_servicio", "resumen_economico", "contacto_ejecutivo", "salto_pagina"]);
export const esSeccionDeTexto = (tipo: string) => !SIN_TEXTO.has(tipo);

/**
 * Secciones con texto tipo de la empresa: cada cotización nueva lo trae precargado. «Texto libre» se repite y no tiene
 * texto tipo; las condiciones por defecto son las de la marca.
 */
export const tieneTextoTipo = (tipo: string) =>
  esSeccionDeTexto(tipo) && tipo !== "texto_libre" && tipo !== "condiciones" && tipo in NOMBRES_BLOQUE_PROPUESTA;
