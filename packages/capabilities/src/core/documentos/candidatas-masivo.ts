// Personas que pueden recibir una plantilla laboral en lote (CAR-633).
import { z } from "zod";

import { ambitoDeClase, PERMISOS_CORE, type ClasePlantilla } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy, paginaCursorLimite200 } from "../maestros/comun";
import { consultaPersonasPaginada } from "../maestros/persona-pagina-db";
import { itemDesdePersona, whereCandidatas } from "./candidatas-masivo-helpers";
import { plantillaVigente } from "./plantilla-vigente";

export const documentoPlantillasCandidatas = defineCapability({
  id: "core.documento_plantillas.candidatas",
  descripcion:
    "Lista las personas del tenant que pueden recibir una plantilla laboral en lote: filtra por instalación, cargo o anexos en borrador, marca quién tiene todos los datos para generar y quién no puede firmar. Solo plantillas sobre persona. No guarda nada.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    plantillaId: uuidSchema,
    instalacionId: uuidSchema.optional(),
    cargoId: uuidSchema.optional(),
    soloVinculoVigente: z.boolean().default(true).describe("Solo personas con vínculo vigente."),
    anexoBorrador: z
      .boolean()
      .optional()
      .describe("Si es verdadero, solo personas con un anexo de contrato en borrador."),
    fecha: diaSchema.optional(),
    q: z.string().trim().max(80).optional(),
  }).extend(paginaCursorLimite200),
  output: z.object({
    items: z.array(
      z.object({
        personaId: z.string(),
        nombre: z.string(),
        descripcion: z.string().describe("Cargo e instalación del vínculo vigente."),
        puedeGenerar: z.boolean(),
        motivoBloqueo: z.string().nullable(),
      }),
    ),
    siguiente: z.string().nullable(),
    total: z.number().int().describe("Personas en esta página."),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((p) => p.personaId),
  async handler(ctx, input) {
    const { plantilla, version } = await plantillaVigente(ctx, input.plantillaId);
    if (ambitoDeClase(plantilla.clase as ClasePlantilla) !== "persona")
      throw reglaDeNegocio("Solo las plantillas laborales admiten envío masivo.");
    const rut = (input.q ?? "").replace(/[.\s]/g, "").toUpperCase();
    const fecha = input.fecha ?? hoy();
    const where = whereCandidatas(ctx, input, rut);
    const { items: paginaPersonas, siguiente } = await consultaPersonasPaginada(
      ctx,
      where,
      input.cursor,
      input.limite,
      { instalacion: true },
    );
    const items = await Promise.all(
      paginaPersonas.map((p) => itemDesdePersona(ctx, plantilla.id, version.contenido, p, fecha)),
    );
    return { items, siguiente, total: items.length };
  },
});