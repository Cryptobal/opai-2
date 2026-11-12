// Vista previa de un documento sobre una cuenta o una instalación (CAR-315 parte 2): rellena la plantilla
// (contrato de servicio, acta…) con los datos de la entidad y dice qué falta. No guarda nada.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { diaSchema } from "../maestros/comun";
import { claseSchema, firmantesSchema, nivelSchema } from "./plantillas-comun";
import { calcularRellenoEntidad } from "./rellenar-entidad-calculo";

const segmento = z.object({
  texto: z.string(),
  negrita: z.boolean(),
  cursiva: z.boolean(),
  faltante: z.string().nullable().describe("Clave de la variable sin valor; null si el texto está completo."),
});

export const documentoPlantillasRellenarEntidad = defineCapability({
  id: "core.documento_plantillas.rellenar_entidad",
  descripcion:
    "Vista previa de un documento sobre una cuenta o una instalación (contrato de servicio, acta): rellena la plantilla con los datos de la entidad y lista lo que falta para poder generarlo. No guarda nada. Solo owner y admin; la entidad debe estar dentro del alcance.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    plantillaId: uuidSchema,
    entidadId: uuidSchema.describe("ID de la cuenta o de la instalación, según el tipo de la plantilla."),
    fecha: diaSchema.optional().describe("Fecha del documento; por defecto, hoy."),
  }),
  output: z.object({
    plantilla: z.object({ id: z.string(), nombre: z.string(), clase: claseSchema, version: z.number() }),
    entidad: z.object({ tipo: z.enum(["cuenta", "instalacion"]), id: z.string(), nombre: z.string() }),
    parrafos: z.array(z.array(segmento)),
    faltantes: z.array(z.object({ clave: z.string(), etiqueta: z.string(), motivo: z.string() })),
    puedeGenerar: z.boolean().describe("Verdadero si no falta ningún dato."),
    firma: z.object({ nivel: nivelSchema, firmantes: firmantesSchema }),
  }),
  efecto: "lectura",
  dryRun: false,
  // Revela datos de la cuenta o la instalación: se audita su ID, sin el texto ni los valores.
  auditarLectura: (s) => [s.entidad.id],
  async handler(ctx, input) {
    const { entidad, plantilla, version, relleno, faltantes } = await calcularRellenoEntidad(ctx, input);
    return {
      plantilla: { id: plantilla.id, nombre: plantilla.nombre, clase: plantilla.clase as z.infer<typeof claseSchema>, version: version.numero },
      entidad: { tipo: entidad.tipo, id: entidad.id, nombre: entidad.nombre },
      parrafos: relleno.parrafos,
      faltantes,
      puedeGenerar: faltantes.length === 0,
      firma: { nivel: plantilla.nivelFirma as z.infer<typeof nivelSchema>, firmantes: (plantilla.firmantes ?? "ambos") as z.infer<typeof firmantesSchema> },
    };
  },
});
