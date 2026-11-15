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

/** Tipos de bloque que la pantalla sabe nombrar, en el orden del catálogo. */
export const TIPOS_BLOQUE_ETIQUETADOS = Object.keys(ETIQUETAS);

export const etiquetaBloquePropuesta = (tipo: string, titulo?: string) =>
  titulo?.trim() || ETIQUETAS[tipo] || tipo;

/** Bloque de la plantilla de propuesta del tenant tal como lo guarda `cpq.plantillas_propuesta.update`. */
export type BloquePlantilla = {
  tipo: string;
  activo: boolean;
  fijo: boolean;
  opcional: boolean;
  bibliotecaClave?: string | null;
};

/** Intercambia el bloque `i` con su vecino; fuera de rango deja la lista igual. */
export function moverBloque<T>(lista: readonly T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  const copia = [...lista];
  const [a, b] = [copia[i], copia[j]];
  if (a === undefined || b === undefined) return copia;
  copia[i] = b;
  copia[j] = a;
  return copia;
}

/** Un bloque fijo siempre sale en la propuesta: queda activo y deja de ser opcional. */
export function fijarBloque(b: BloquePlantilla, fijo: boolean): BloquePlantilla {
  return { ...b, fijo, opcional: !fijo, activo: fijo ? true : b.activo };
}

/** Tipos del catálogo que todavía no están en la plantilla (para «Agregar bloque»). */
export const tiposDisponibles = (lista: readonly BloquePlantilla[]) =>
  TIPOS_BLOQUE_ETIQUETADOS.filter((t) => !lista.some((b) => b.tipo === t));

/** Bloque del armador de una cotización, tal como lo devuelve `cpq.propuestas_tecnica.get`. */
export type BloqueArmador = BloquePlantilla & {
  id: string;
  titulo?: string;
  contenidoOverride?: string | null;
  editadoParaCliente?: boolean;
};

/** Bloques que salen del CPQ, la marca o la estructura: no llevan texto que la persona redacte. */
const SIN_TEXTO = new Set(["portada", "indice", "detalle_servicio", "resumen_economico", "contacto_ejecutivo", "salto_pagina"]);
export const esSeccionDeTexto = (tipo: string) => !SIN_TEXTO.has(tipo);

/** Deja el borrador aceptado como texto de un bloque; los demás quedan iguales. */
export const conTextoAceptado = (bloques: readonly BloqueArmador[], id: string, texto: string): BloqueArmador[] =>
  bloques.map((b) => (b.id === id ? { ...b, contenidoOverride: texto } : b));
