import { z } from "zod";

import {
  CLASES_FIRMA,
  minimoDeClase,
  NIVELES_FIRMA,
  nivelValido,
  ORDENES_FIRMA,
  PLAZO_FIRMA_DIAS,
  PLAZO_FIRMA_DIAS_MAX,
  REGLAS_CLASE_FIRMA,
  type ClaseFirma,
  type NivelFirma,
} from "@opai/domain";
import { PERMISOS_CORE } from "@opai/domain";

export const PERMISO_FIRMAS_CONFIG = PERMISOS_CORE.firmasConfig;

export const claseSchema = z.enum(CLASES_FIRMA);
export const nivelSchema = z.enum(NIVELES_FIRMA);
/** N3 (FEA) queda apagada en la v1 y solo detrás de la interfaz del prestador (R2, P2/P3, PR 1). */
export const nivelDisponibleSchema = z.enum(["N1", "N2"]);
export const ordenSchema = z.enum(ORDENES_FIRMA);

/** Política de firma tal como la devuelven las capacidades (fechas serializadas a ISO). */
export const politicaSchema = z.object({
  clase: claseSchema,
  nivelMinimo: nivelSchema,
  nivelesPermitidos: z.array(nivelSchema),
  orden: ordenSchema,
  plazoDias: z.number().int(),
  recordar: z.boolean(),
  /** false = valores por defecto de la vertical; true = el tenant la fijó. */
  personalizada: z.boolean(),
});
export type VistaPolitica = z.infer<typeof politicaSchema>;

/** Política efectiva de una clase: lo guardado por el tenant o el defecto legal de la vertical (R1, R2). */
export function politicaEfectiva(
  clase: ClaseFirma,
  fila: {
    nivelMinimo: string;
    nivelesPermitidos: string[];
    orden: string;
    plazoDias: number;
    recordar: boolean;
  } | null,
): VistaPolitica {
  if (fila) {
    return {
      clase,
      nivelMinimo: fila.nivelMinimo as NivelFirma,
      nivelesPermitidos: fila.nivelesPermitidos as NivelFirma[],
      orden: fila.orden as VistaPolitica["orden"],
      plazoDias: fila.plazoDias,
      recordar: fila.recordar,
      personalizada: true,
    };
  }
  // Defecto: el mínimo legal de la clase y sus niveles permitidos sin N3 (apagada por defecto, R2).
  const permitidos = REGLAS_CLASE_FIRMA[clase].permitidos.filter((n) => n !== "N3");
  return {
    clase,
    nivelMinimo: minimoDeClase(clase),
    nivelesPermitidos: [...permitidos],
    orden: "secuencial",
    plazoDias: PLAZO_FIRMA_DIAS,
    recordar: true,
    personalizada: false,
  };
}

/** Valida una política propuesta contra el mínimo legal (R2, R3) y el apagado de N3 (CA4). */
export function validarPolitica(
  clase: ClaseFirma,
  nivelMinimo: NivelFirma,
  nivelesPermitidos: readonly NivelFirma[],
): string | null {
  if (nivelMinimo === "N3" || nivelesPermitidos.includes("N3")) {
    return "N3 (FEA) está apagada en esta versión; se activa al contratar el prestador (P2/P3).";
  }
  const min = minimoDeClase(clase);
  // El tenant sube el nivel, nunca baja del mínimo legal de la plataforma (R2). CA4.
  if (!nivelValido(clase, nivelMinimo)) {
    return `El nivel mínimo ${nivelMinimo} no es válido para esta clase; el mínimo legal es ${min}.`;
  }
  for (const n of nivelesPermitidos) {
    if (!nivelValido(clase, n)) {
      return `El nivel ${n} no es válido para esta clase (mínimo legal ${min}).`;
    }
  }
  if (!nivelesPermitidos.includes(nivelMinimo)) {
    return "El nivel mínimo debe estar entre los niveles permitidos.";
  }
  return null;
}

export const PLAZO_MAX = PLAZO_FIRMA_DIAS_MAX;
