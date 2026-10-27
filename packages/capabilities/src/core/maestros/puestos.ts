import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
// Alcance por filas (#51, ADR-022): la lista filtra con dondePuesto y puestoDe (en puestos-ayuda)
// usa findFirst con el mismo alcance, para que un supervisor fuera de su instalación reciba «no
// encontrado». El resto de la lógica de posición (función, patrón, tramos, horas) es del Brief 11.
import { dondePuesto } from "./alcance";
import { incluir, puestoDe } from "./puestos-ayuda";
import { puestoSchema, vistaPuesto } from "./puestos-vista";

export const puestosList = defineCapability({
  id: "core.puestos.list",
  descripcion:
    "Puestos (posiciones) de una instalación o de un cargo: función, patrón de turno (p. ej. 4×4), horario por tramos, horas semanales, colación y cobertura PPC. Una fila por posición.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z
    .object({
      instalacionId: uuidSchema.optional(),
      cargoId: uuidSchema.optional().describe("Puestos de este cargo (p. ej. para elegir puesto)."),
      soloActivos: z.boolean().default(false),
    })
    .refine((i) => i.instalacionId || i.cargoId, "Envía instalacionId o cargoId."),
  output: z.array(puestoSchema.extend({ instalacion: z.string() })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.puesto.findMany({
      where: {
        AND: [dondePuesto(ctx)],
        ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
        ...(input.cargoId ? { cargoId: input.cargoId } : {}),
        ...(input.soloActivos ? { estado: "activo" } : {}),
      },
      include: { ...incluir, instalacion: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    });
    return filas.map((f) => ({ ...vistaPuesto(f), instalacion: f.instalacion.nombre }));
  },
});

export const puestosGet = defineCapability({
  id: "core.puestos.get",
  descripcion:
    "Ficha de un puesto (posición): función, patrón de turno, horario por tramos, horas, colación, cobertura y vigencia.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ id: uuidSchema }),
  output: puestoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => vistaPuesto(await puestoDe(ctx, input.id)),
});
