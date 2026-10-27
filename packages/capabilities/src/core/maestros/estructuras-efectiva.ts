import { z } from "zod";

import {
  combinarPorConcepto,
  haberes,
  PERMISOS_CORE,
  resolverCapasSueldo,
  type EstructuraCapa,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy } from "./comun";
import { itemsDe, ocultarMontos } from "./estructuras-acceso";
import { dondeEstructura } from "./estructuras-alcance";
import { aDominio, estructuraSchema, NIVELES, vistaEstructura } from "./estructuras-vista";
import { personaDe } from "./personas-vista";
import { dondeInstalacion, dondePuesto } from "./alcance";

export const estructurasEfectiva = defineCapability({
  id: "core.estructuras.efectiva",
  descripcion:
    "Resuelve una sola capa completa: RUT → puesto → instalación, sin herencia. Puesto e instalación son explícitos hasta el PR 3 del vínculo. Devuelve capa, versión y conceptos faltantes; nunca calcula haberes de una estructura incompleta.",
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
           valores: z.object({ persona: z.unknown(), puesto: z.unknown(), cargo: z.unknown(), instalacion: z.unknown() }),
          final: z.unknown(),
          origen: z.enum(NIVELES).nullable(),
        }),
      )
      .describe("Concepto a concepto; valores null si no lo define el nivel o si son sensibles."),
    haberes: z.record(z.string(), z.number()).nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const fecha = input.fecha ?? hoy();
    await personaDe(ctx, input.personaId);
    if (input.puestoId) {
      const puesto = await ctx.db.puesto.findFirst({ where: { id: input.puestoId, AND: [dondePuesto(ctx)] } });
      if (!puesto) throw noEncontrado("La referencia");
      if (input.instalacionId && puesto.instalacionId !== input.instalacionId)
        throw reglaDeNegocio("El puesto no pertenece a la instalación elegida.");
    }
    if (input.instalacionId && !await ctx.db.instalacion.findFirst({
      where: { id: input.instalacionId, AND: [dondeInstalacion(ctx)] },
    })) throw noEncontrado("La referencia");
    const refs = [
      { nivel: "persona", personaId: input.personaId },
      ...(input.puestoId ? [{ nivel: "puesto", puestoId: input.puestoId }] : []),
      ...(input.instalacionId ? [{ nivel: "instalacion", instalacionId: input.instalacionId }] : []),
    ];
    const filas = await ctx.db.estructuraSueldo.findMany({
      where: { OR: refs, estado: "vigente", AND: [await dondeEstructura(ctx)] },
    });
    const items = await itemsDe(
      ctx,
      filas.map((f) => f.id),
    );
    const dominio = new Map(filas.map((f) => [f.id, aDominio(f, items.get(f.id) ?? [])]));
    const por = (n: string) =>
      filas.filter((f) => f.nivel === n).map((f) => dominio.get(f.id) as EstructuraCapa);
    const r = resolverCapasSueldo(fecha, {
      persona: por("persona"),
      puesto: por("puesto"),
      instalacion: por("instalacion"),
    });
    const combinada = combinarPorConcepto(r.capas);
    // Sensibilidad por fila (cargo, puesto o persona) y, si alguna lo exige, sin haberes.
    const ocultas = new Map(
      await Promise.all(filas.map(async (f) => [f.id, await ocultarMontos(ctx, f)] as const)),
    );
    const ocultar = [...ocultas.values()].some(Boolean);
    const vista = (e: EstructuraCapa | null) => {
      const f = e ? filas.find((x) => x.id === e.id) : undefined;
      return f ? vistaEstructura(f, items.get(f.id) ?? [], ocultas.get(f.id) ?? true) : null;
    };
    return {
      fecha,
      aplica: r.capa,
      capa: r.capa,
      estado: r.estado,
      conceptosFaltantes: r.conceptosFaltantes,
      estructura: vista(r.estructura),
      niveles: {
        persona: vista(r.capas.persona),
        puesto: vista(r.capas.puesto),
        instalacion: vista(r.capas.instalacion),
        cargo: null,
      },
      conceptos: ocultar
        ? combinada.conceptos.map((c) => ({
            ...c,
            valores: { persona: null, puesto: null, cargo: null, instalacion: null },
            final: null,
          }))
        : combinada.conceptos,
      haberes:
        r.estado === "completa" && combinada.estructura && input.imm && !ocultar
          ? { ...haberes(combinada.estructura, input.imm) }
          : null,
    };
  },
});
