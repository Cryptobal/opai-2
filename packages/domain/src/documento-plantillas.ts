// Plantillas laborales de Documentos (CAR-127, decisiones de Carlos del 9-nov-2026). Reglas puras:
// sin Next, React ni base de datos. El contenido es texto con variables `{grupo.clave}` que el
// generador (PR 4) resolverá y renderizará a PDF. Las salidas comerciales viven en CPQ. No confundir
// con `plantillas.ts` (plantillas de comunicaciones, ADR-020).

import { type ClaseFirma, type NivelFirma, nivelValido } from "./firma";

/** Clases de firma que pueden tener plantilla laboral (las comerciales no entran: viven en CPQ). */
export const CLASES_PLANTILLA = [
  "contrato_trabajo",
  "anexo_contrato",
  "recepcion_laboral",
  "carta_trabajador",
] as const satisfies readonly ClaseFirma[];
export type ClasePlantilla = (typeof CLASES_PLANTILLA)[number];

/** Etiqueta de la columna «Tipo» de la lista (diseño 05). */
export const ETIQUETA_CLASE_PLANTILLA: Readonly<Record<ClasePlantilla, string>> = {
  contrato_trabajo: "Contrato de trabajo",
  anexo_contrato: "Anexo",
  recepcion_laboral: "Recepción",
  carta_trabajador: "Carta",
};

/** Nivel de firma por defecto de una plantilla: N1 o N2 (N3·FEA queda deshabilitado, CAR-94). */
export const NIVELES_PLANTILLA = ["N1", "N2"] as const satisfies readonly NivelFirma[];
export type NivelPlantilla = (typeof NIVELES_PLANTILLA)[number];

/** Cómo nació la plantilla. «word» y «pdf» se habilitan con el encargo de importación (pantalla 09). */
export const ORIGENES_PLANTILLA = ["creada", "word", "pdf"] as const;
export type OrigenPlantilla = (typeof ORIGENES_PLANTILLA)[number];

/** El nivel por defecto vale si la política de la clase lo permite y no baja del mínimo legal. */
export const nivelPlantillaValido = (clase: ClasePlantilla, nivel: NivelPlantilla): boolean =>
  nivelValido(clase, nivel);

export type GrupoVariable = "persona" | "vinculo" | "instalacion" | "sueldo" | "contrato";

export type VariablePlantilla = {
  /** Token tal como se escribe en el texto, sin llaves: `persona.rut`. */
  clave: string;
  grupo: GrupoVariable;
  etiqueta: string;
  /** Exige lectura sensible de sueldos al generar (decisión 6). */
  sensible: boolean;
};

const v = (
  grupo: GrupoVariable,
  campo: string,
  etiqueta: string,
  sensible = false,
): VariablePlantilla => ({ clave: `${grupo}.${campo}`, grupo, etiqueta, sensible });

/** Variables permitidas: solo Persona, Vínculo, Instalación, Sueldo y Contrato (decisión 7). */
export const VARIABLES_PLANTILLA: readonly VariablePlantilla[] = [
  v("persona", "nombre", "Nombre completo"),
  v("persona", "rut", "RUT"),
  v("persona", "direccion", "Dirección"),
  v("persona", "comuna_laboral", "Comuna laboral"),
  v("vinculo", "cargo", "Cargo"),
  v("vinculo", "inicio", "Fecha de inicio"),
  v("vinculo", "jornada", "Jornada"),
  v("instalacion", "nombre", "Nombre de la instalación"),
  v("instalacion", "direccion", "Dirección de la instalación"),
  v("sueldo", "base", "Sueldo base", true),
  v("sueldo", "gratificacion", "Gratificación", true),
  v("contrato", "fecha", "Fecha del contrato"),
  v("contrato", "motivo_cambio", "Motivo del cambio (anexos)"),
  v("contrato", "cambios", "Detalle de los cambios (anexos)"),
];

const CLAVES = new Set(VARIABLES_PLANTILLA.map((x) => x.clave));
const TOKEN = /\{([a-z]+\.[a-z_]+)\}/g;

/** Claves `{grupo.clave}` que aparecen en el texto, sin repetir y en orden de aparición. */
export function variablesDeDocumento(texto: string): string[] {
  const vistas = new Set<string>();
  for (const m of texto.matchAll(TOKEN)) vistas.add(m[1] ?? "");
  return [...vistas];
}

/** Claves que no están en el catálogo (la capacidad y el editor las rechazan). */
export const variablesDocumentoDesconocidas = (texto: string): string[] =>
  variablesDeDocumento(texto).filter((c) => !CLAVES.has(c));

/** El texto usa alguna variable de sueldo (la generación pedirá lectura sensible). */
export const documentoUsaVariablesSensibles = (texto: string): boolean =>
  variablesDeDocumento(texto).some((c) => c.startsWith("sueldo."));
