/** Nombre legible de cada bloque de la propuesta técnica (pantalla). */
const ETIQUETAS: Record<string, string> = {
  portada: "Portada",
  indice: "Índice",
  seccion_institucional: "Presentación institucional",
  comprension_servicio: "Comprensión del servicio",
  detalle_servicio: "Detalle del servicio",
  resumen_economico: "Resumen económico",
  condiciones: "Condiciones",
  incluye_exclusiones: "Incluye y exclusiones",
  metodologia: "Metodología",
  contacto_ejecutivo: "Contacto ejecutivo",
  certificaciones: "Certificaciones",
  clientes_referencia: "Clientes de referencia",
  texto_libre: "Texto libre",
  salto_pagina: "Salto de página",
};

export const etiquetaBloquePropuesta = (tipo: string, titulo?: string) =>
  titulo?.trim() || ETIQUETAS[tipo] || tipo;
