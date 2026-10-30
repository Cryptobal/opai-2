import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { PERMISO_CONFIG, dondeInstalacionId, instalacionEnAlcance } from "./comun";
import {
  horariosSchema,
  programacionSchema,
  responsablesSchema,
  vistaProgramacion,
} from "./vistas";

const diasSchema = z.array(z.number().int().min(0).max(6)).max(7);

/** La plantilla es de la instalación indicada y del alcance del actor (sin enumeración). */
async function plantillaDeInstalacion(ctx: Contexto, instalacionId: string, plantillaId: string) {
  const pl = await ctx.db.plantillaRonda.findFirst({
    // `instalacionId` y el alcance van en `AND`: el spread de `dondeInstalacionId` pisaría el
    // `instalacionId` pedido y dejaría usar una plantilla de otra instalación del alcance.
    where: { id: plantillaId, estado: "activo", AND: [{ instalacionId }, dondeInstalacionId(ctx)] },
    select: { id: true },
  });
  if (!pl) throw noEncontrado("La plantilla");
}

/** Cada persona existe en el tenant y tiene un vínculo vigente en la instalación (sin enumeración). */
async function personasDeInstalacion(
  ctx: Contexto,
  instalacionId: string,
  personaIds: readonly string[],
) {
  if (personaIds.length === 0) return;
  const unicos = [...new Set(personaIds)];
  const filas = await ctx.db.persona.findMany({
    where: { id: { in: unicos }, vinculos: { some: { estado: "vigente", instalacionId } } },
    select: { id: true },
  });
  if (filas.length !== unicos.length) throw noEncontrado("La persona");
}

async function programacionDe(ctx: Contexto, id: string) {
  const p = await ctx.db.programacion.findFirst({ where: { id, ...dondeInstalacionId(ctx) } });
  if (!p) throw noEncontrado("La programación");
  return p;
}

/** Define o actualiza una programación: cuándo se hace una plantilla y a quién se asigna. */
export const programacionesFijar = defineCapability({
  id: "rondas.programaciones.fijar",
  descripcion:
    "Define o actualiza cuándo se hace una plantilla de ronda y a quién se asigna: horarios, días de la semana, vigencia, tolerancia para iniciar y responsables (personas o quien esté de turno).",
  permiso: PERMISO_CONFIG,
  input: z.object({
    id: uuidSchema.optional(),
    instalacionId: uuidSchema,
    plantillaId: uuidSchema,
    nombre: z.string().trim().min(2).max(80),
    horarios: horariosSchema,
    diasSemana: diasSchema.default([]),
    vigenciaDesde: z.string().date().nullable().optional(),
    vigenciaHasta: z.string().date().nullable().optional(),
    toleranciaMin: z.number().int().min(0).max(240).default(15),
    responsables: responsablesSchema.default({ modo: "personas", personaIds: [] }),
  }),
  output: programacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    await plantillaDeInstalacion(ctx, input.instalacionId, input.plantillaId);
    await personasDeInstalacion(ctx, input.instalacionId, input.responsables.personaIds);
    if (input.id) {
      const actual = await programacionDe(ctx, input.id);
      if (actual.instalacionId !== input.instalacionId)
        throw reglaDeNegocio("La programación es de otra instalación.");
    }
    const data = {
      instalacionId: input.instalacionId,
      plantillaId: input.plantillaId,
      nombre: input.nombre,
      horarios: input.horarios,
      diasSemana: input.diasSemana,
      vigenciaDesde: input.vigenciaDesde ? new Date(input.vigenciaDesde) : null,
      vigenciaHasta: input.vigenciaHasta ? new Date(input.vigenciaHasta) : null,
      toleranciaMin: input.toleranciaMin,
      responsables: input.responsables,
    };
    if (dryRun) {
      return vistaProgramacion({ id: input.id ?? "", estado: "activa", ...data });
    }
    const fila = input.id
      ? await ctx.db.programacion.update({ where: { id: input.id }, data })
      : await ctx.db.programacion.create({
          data: { ...data, estado: "activa", tenantId: ctx.tenantId },
        });
    return vistaProgramacion(fila);
  },
});

/** Pausa o reactiva una programación (deja de generar rondas mientras está pausada). */
export const programacionesPausar = defineCapability({
  id: "rondas.programaciones.pausar",
  descripcion:
    "Pausa una programación de ronda para que deje de generar rondas, o la reactiva. No borra la programación ni su historial.",
  permiso: PERMISO_CONFIG,
  input: z.object({ id: uuidSchema, pausada: z.boolean().default(true) }),
  output: programacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, pausada }, { dryRun }) {
    const prog = await programacionDe(ctx, id);
    const estado = pausada ? "pausada" : "activa";
    if (dryRun) return vistaProgramacion({ ...prog, estado });
    const fila = await ctx.db.programacion.update({ where: { id }, data: definidos({ estado }) });
    return vistaProgramacion(fila);
  },
});
