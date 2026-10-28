import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aFecha, diaSchema, hoy } from "./comun";
import { ocultasDe } from "./estructuras-lectura";
import { resolverVistaEfectiva } from "./estructuras-resolver-vista";
import { dondeEstructura } from "./estructuras-alcance";
import { estructuraSchema, NIVELES } from "./estructuras-vista";
import { personaDe } from "./personas-vista";
import { dondeInstalacion, dondePuesto } from "./alcance";

export const estructurasEfectiva = defineCapability({
  auditarLectura: (s) => Object.values(s.niveles).flatMap((e) => (e ? [e.id] : [])),
  id: "core.estructuras.efectiva",
  descripcion:
    "Resuelve una sola capa completa: RUT → puesto → instalación, sin herencia. Por defecto usa instalación y puesto del vínculo vigente. Devuelve capa, versión y conceptos faltantes; nunca calcula haberes de una estructura incompleta.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({
    personaId: uuidSchema,
    fecha: diaSchema.optional().describe("Por defecto, hoy."),
    puestoId: uuidSchema
      .optional()
      .describe("Puesto a considerar (sin asignaciones en este brief)."),
    instalacionId: uuidSchema.optional(),
    imm: z.number().int().min(1).optional().describe("Ingreso mínimo mensual vigente, en CLP."),
  }),
  output: z.object({
    fecha: z.string(),
    aplica: z.enum(NIVELES).nullable(),
    capa: z.enum(["persona", "puesto", "instalacion"]).nullable(),
    estado: z.enum(["sin_capa", "incompleta", "completa"]),
    conceptosFaltantes: z.array(z.string()),
    estructura: estructuraSchema.nullable(),
    niveles: z.object({
      persona: estructuraSchema.nullable(),
      puesto: estructuraSchema.nullable(),
      cargo: estructuraSchema.nullable(),
      instalacion: estructuraSchema.nullable(),
    }),
    conceptos: z
      .array(
        z.object({
          clave: z.string(),
          nombre: z.string(),
          valores: z.object({
            persona: z.unknown(),
            puesto: z.unknown(),
            cargo: z.unknown(),
            instalacion: z.unknown(),
          }),
          final: z.unknown(),
          origen: z.enum(NIVELES).nullable(),
        }),
      )
      .describe("Conceptos de una capa; null si son incompletos u ocultos."),
    haberes: z.record(z.string(), z.number()).nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const fecha = input.fecha ?? hoy();
    await personaDe(ctx, input.personaId);
    const vinculo = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId: input.personaId, estado: "vigente" },
    });
    input = {
      ...input,
      ...(input.instalacionId
        ? {}
        : vinculo?.instalacionId
          ? { instalacionId: vinculo.instalacionId }
          : {}),
      ...(input.puestoId || input.instalacionId
        ? {}
        : vinculo?.puestoId
          ? { puestoId: vinculo.puestoId }
          : {}),
    };
    if (input.puestoId) {
      const puesto = await ctx.db.puesto.findFirst({
        where: { id: input.puestoId, AND: [dondePuesto(ctx)] },
      });
      if (!puesto) throw noEncontrado("La referencia");
      if (input.instalacionId && puesto.instalacionId !== input.instalacionId)
        throw reglaDeNegocio("El puesto no pertenece a la instalación elegida.");
    }
    if (
      input.instalacionId &&
      !(await ctx.db.instalacion.findFirst({
        where: { id: input.instalacionId, AND: [dondeInstalacion(ctx)] },
      }))
    )
      throw noEncontrado("La referencia");
    const refs = [
      { nivel: "persona", personaId: input.personaId },
      ...(input.puestoId ? [{ nivel: "puesto", puestoId: input.puestoId }] : []),
      ...(input.instalacionId
        ? [{ nivel: "instalacion", instalacionId: input.instalacionId }]
        : []),
    ];
    const filas = await ctx.db.estructuraSueldo.findMany({
      where: {
        OR: refs,
        estado: "vigente",
        vigenteDesde: { lte: aFecha(fecha) },
        AND: [
          await dondeEstructura(ctx),
          { OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFecha(fecha) } }] },
        ],
      },
      include: { items: { orderBy: { orden: "asc" } } },
    });
    return resolverVistaEfectiva(fecha, filas, await ocultasDe(ctx, filas), input.imm);
  },
});
