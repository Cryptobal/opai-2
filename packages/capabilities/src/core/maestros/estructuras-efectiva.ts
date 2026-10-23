import { z } from "zod";

import { haberes, PERMISOS_CORE, resolverEstructura, type Estructura } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy } from "./comun";
import { itemsDe, ocultarMontos } from "./estructuras-acceso";
import { aDominio, estructuraSchema, NIVELES, vistaEstructura } from "./estructuras-vista";
import { personaDe } from "./personas-vista";

export const estructurasEfectiva = defineCapability({
  id: "core.estructuras.efectiva",
  descripcion:
    "Sueldo efectivo de una persona a una fecha: resuelve persona → puesto → cargo, muestra los tres niveles y cuál aplica. Con el ingreso mínimo (imm) calcula haberes y la gratificación legal con tope.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({
    personaId: uuidSchema,
    fecha: diaSchema.optional().describe("Por defecto, hoy."),
    puestoId: uuidSchema
      .optional()
      .describe("Puesto a considerar (sin asignaciones en este brief)."),
    imm: z.number().int().min(1).optional().describe("Ingreso mínimo mensual vigente, en CLP."),
  }),
  output: z.object({
    fecha: z.string(),
    aplica: z.enum(NIVELES).nullable(),
    niveles: z.object({
      persona: estructuraSchema.nullable(),
      puesto: estructuraSchema.nullable(),
      cargo: estructuraSchema.nullable(),
    }),
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
    const refs = [
      { nivel: "persona", personaId: input.personaId },
      ...(input.puestoId ? [{ nivel: "puesto", puestoId: input.puestoId }] : []),
      ...(vinculo ? [{ nivel: "cargo", cargoId: vinculo.cargoId }] : []),
    ];
    const filas = await ctx.db.estructuraSueldo.findMany({
      where: { OR: refs, estado: "vigente" },
    });
    const items = await itemsDe(
      ctx,
      filas.map((f) => f.id),
    );
    const dominio = new Map(filas.map((f) => [f.id, aDominio(f, items.get(f.id) ?? [])]));
    const por = (n: string) =>
      filas.filter((f) => f.nivel === n).map((f) => dominio.get(f.id) as Estructura);
    const r = resolverEstructura(fecha, {
      persona: por("persona"),
      puesto: por("puesto"),
      cargo: por("cargo"),
    });
    // Sensibilidad por fila (cargo, puesto o persona) y, si alguna lo exige, sin haberes.
    const ocultas = new Map(
      await Promise.all(filas.map(async (f) => [f.id, await ocultarMontos(ctx, f)] as const)),
    );
    const ocultar = [...ocultas.values()].some(Boolean);
    const vista = (e: Estructura | null) => {
      const f = e ? filas.find((x) => x.id === e.id) : undefined;
      return f ? vistaEstructura(f, items.get(f.id) ?? [], ocultas.get(f.id) ?? true) : null;
    };
    return {
      fecha,
      aplica: r.aplica,
      niveles: {
        persona: vista(r.niveles.persona),
        puesto: vista(r.niveles.puesto),
        cargo: vista(r.niveles.cargo),
      },
      haberes:
        r.estructura && input.imm && !ocultar ? { ...haberes(r.estructura, input.imm) } : null,
    };
  },
});
