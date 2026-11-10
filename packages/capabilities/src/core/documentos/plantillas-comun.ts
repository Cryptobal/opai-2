import { z } from "zod";

import {
  CLASES_PLANTILLA,
  ETIQUETA_CLASE_PLANTILLA,
  NIVELES_PLANTILLA,
  VARIABLES_PLANTILLA,
  nivelPlantillaValido,
  type ClasePlantilla,
  type NivelPlantilla,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";

export const claseSchema = z.enum(CLASES_PLANTILLA);
export const nivelSchema = z
  .enum(NIVELES_PLANTILLA)
  .describe("Firma por defecto. N3 (FEA) no está habilitada.");
export const nombreSchema = z.string().trim().min(2).max(120);
const VARIABLES = VARIABLES_PLANTILLA.map((v) => `{${v.clave}}`).join(", ");
export const contenidoSchema = z
  .string()
  .max(100_000)
  .describe(`Texto con variables entre llaves. Solo se aceptan: ${VARIABLES}.`);

export const plantillaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  clase: claseSchema,
  tipo: z.string().describe("Etiqueta de la clase, p. ej. «Contrato de trabajo»."),
  nivelFirma: nivelSchema,
  origen: z.enum(["creada", "word", "pdf"]),
  versionVigente: z.number(),
  activa: z.boolean(),
  ultimaEdicionPor: z.string().nullable(),
  ultimaEdicionEn: z.string().nullable().describe("ISO 8601."),
});
type FilaPlantilla = {
  id: string;
  nombre: string;
  clase: string;
  nivelFirma: string;
  origen: string;
  versionVigente: number;
  activa: boolean;
};
type FilaVersion = { creadoPorNombre: string | null; createdAt: Date };

export const vista = (
  p: FilaPlantilla,
  v: FilaVersion | null,
): z.infer<typeof plantillaSchema> => ({
  id: p.id,
  nombre: p.nombre,
  clase: p.clase as ClasePlantilla,
  tipo: ETIQUETA_CLASE_PLANTILLA[p.clase as ClasePlantilla] ?? p.clase,
  nivelFirma: p.nivelFirma as NivelPlantilla,
  origen: p.origen as "creada" | "word" | "pdf",
  versionVigente: p.versionVigente,
  activa: p.activa,
  ultimaEdicionPor: v?.creadoPorNombre ?? null,
  ultimaEdicionEn: v ? v.createdAt.toISOString() : null,
});

/** El nivel por defecto debe valer para la clase (N1 no sirve para contrato ni anexo). */
export function validarNivel(clase: ClasePlantilla, nivel: NivelPlantilla) {
  if (!nivelPlantillaValido(clase, nivel))
    throw reglaDeNegocio(`La firma ${nivel} no es válida para ${ETIQUETA_CLASE_PLANTILLA[clase]}.`);
}
