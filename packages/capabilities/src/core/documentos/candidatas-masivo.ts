// Personas que pueden recibir una plantilla laboral en lote (CAR-633).
import { z } from "zod";

import { ambitoDeClase, PERMISOS_CORE, type ClasePlantilla } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy } from "../maestros/comun";
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
    cursor: uuidSchema.optional().describe("Para seguir: el valor `siguiente` anterior."),
    limite: z.number().int().min(1).max(200).default(200),
  }),
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
    if (input.cursor) {
      const ancla = await ctx.db.persona.findFirst({ where: { AND: [where, { id: input.cursor }] } });
      if (!ancla) throw noEncontrado("La página pedida");
    }
    const filas = await ctx.db.persona.findMany({
      where,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: {
        vinculos: {
          where: { estado: "vigente" },
          include: { cargo: { select: { nombre: true } }, instalacion: { select: { nombre: true } } },
          take: 1,
        },
      },
    });
    const pagina = filas.slice(0, input.limite);
    const items = await Promise.all(
      pagina.map((p) => itemDesdePersona(ctx, plantilla.id, version.contenido, p, fecha)),
    );
    return {
      items,
      siguiente: filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null,
      total: items.length,
    };
  },
});