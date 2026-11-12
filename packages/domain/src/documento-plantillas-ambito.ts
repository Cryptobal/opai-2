// Ámbito de una plantilla de Documentos (CAR-315 parte 2): sobre qué se genera y qué variables admite.
// Las plantillas laborales se generan sobre una persona; el contrato de servicio, sobre una cuenta; el
// acta, sobre una instalación. Reglas puras, sin Next, React ni base de datos.

import {
  VARIABLES_PLANTILLA,
  variablesDeDocumento,
  type ClasePlantilla,
  type GrupoVariable,
} from "./documento-plantillas";

export const AMBITOS_PLANTILLA = ["persona", "cuenta", "instalacion"] as const;
export type AmbitoPlantilla = (typeof AMBITOS_PLANTILLA)[number];

export const ETIQUETA_AMBITO_PLANTILLA: Readonly<Record<AmbitoPlantilla, string>> = {
  persona: "Persona",
  cuenta: "Cuenta",
  instalacion: "Instalación",
};

/** Sobre qué entidad se genera cada clase de plantilla. */
export const AMBITO_DE_CLASE: Readonly<Record<ClasePlantilla, AmbitoPlantilla>> = {
  contrato_trabajo: "persona",
  anexo_contrato: "persona",
  recepcion_laboral: "persona",
  carta_trabajador: "persona",
  contrato_servicio: "cuenta",
  acta: "instalacion",
};

export const ambitoDeClase = (clase: ClasePlantilla): AmbitoPlantilla => AMBITO_DE_CLASE[clase];

const GRUPOS_DE_AMBITO: Readonly<Record<AmbitoPlantilla, readonly GrupoVariable[]>> = {
  persona: ["persona", "vinculo", "instalacion", "sueldo", "contrato"],
  cuenta: ["cuenta", "contrato"],
  instalacion: ["instalacion", "cuenta", "contrato"],
};

export const gruposDeAmbito = (ambito: AmbitoPlantilla): readonly GrupoVariable[] => GRUPOS_DE_AMBITO[ambito];

/** Variables del catálogo que admite una clase de plantilla. */
export const variablesDeClase = (clase: ClasePlantilla) =>
  VARIABLES_PLANTILLA.filter((v) => gruposDeAmbito(ambitoDeClase(clase)).includes(v.grupo));

/** Claves del texto que no existen o no valen para la clase (p. ej. `sueldo.base` en un acta). */
export function variablesFueraDeClase(texto: string, clase: ClasePlantilla): string[] {
  const validas = new Set(variablesDeClase(clase).map((v) => v.clave));
  return variablesDeDocumento(texto).filter((c) => !validas.has(c));
}
