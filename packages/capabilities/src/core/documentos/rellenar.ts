// Vista previa de un documento laboral (CAR-127, PR 4a · 07 Generar documento): rellena la plantilla con
// los datos de la persona y dice qué falta. No guarda nada; la generación del PDF viene en el PR 4b.
import { z } from "zod";

import {
  PERMISOS_CORE,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { diaSchema } from "../maestros/comun";
import { claseSchema, firmantesSchema, nivelSchema } from "./plantillas-comun";
import { calcularRelleno } from "./rellenar-calculo";

const segmento = z.object({
  texto: z.string(),
  negrita: z.boolean(),
  cursiva: z.boolean(),
  faltante: z.string().nullable().describe("Clave de la variable sin valor; null si el texto está completo."),
});

export const documentoPlantillasRellenar = defineCapability({
  id: "core.documento_plantillas.rellenar",
  descripcion:
    "Vista previa de un documento laboral: rellena una plantilla con los datos de una persona (nombre, RUT, dirección, cargo, jornada, instalación y, con lectura sensible, sueldo) y lista lo que falta para poder generarlo. No guarda nada. Solo owner y admin; la persona debe estar dentro del alcance.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    plantillaId: uuidSchema,
    personaId: uuidSchema,
    fecha: diaSchema.optional().describe("Fecha del documento y con la que se resuelve el sueldo; por defecto, hoy."),
  }),
  output: z.object({
    plantilla: z.object({ id: z.string(), nombre: z.string(), clase: claseSchema, version: z.number() }),
    persona: z.object({ id: z.string(), nombre: z.string() }),
    parrafos: z.array(z.array(segmento)),
    faltantes: z.array(z.object({ clave: z.string(), etiqueta: z.string(), motivo: z.string() })),
    puedeGenerar: z.boolean().describe("Verdadero si no falta ningún dato."),
    firma: z.object({ nivel: nivelSchema, firmantes: firmantesSchema }),
  }),
  efecto: "lectura",
  dryRun: false,
  // Revela datos personales: se audita el ID de la persona, sin el texto ni los valores.
  auditarLectura: (s) => [s.persona.id],
  async handler(ctx, input) {
    const { persona, plantilla, version, relleno, faltantes } = await calcularRelleno(ctx, input);
    return {
      plantilla: { id: plantilla.id, nombre: plantilla.nombre, clase: plantilla.clase as z.infer<typeof claseSchema>, version: version.numero },
      persona: { id: persona.id, nombre: `${persona.nombres} ${persona.apellidos}` },
      parrafos: relleno.parrafos,
      faltantes,
      puedeGenerar: faltantes.length === 0,
      firma: { nivel: plantilla.nivelFirma as z.infer<typeof nivelSchema>, firmantes: (plantilla.firmantes ?? "ambos") as z.infer<typeof firmantesSchema> },
    };
  },
});

