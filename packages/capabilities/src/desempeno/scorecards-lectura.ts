import { esPeriodoMensual, versionVigente } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { mesesDe, PERMISOS_DESEMPENO, scorecardSchema, versionesDe, vistaScorecard } from "./comun";

const periodo = z
  .string()
  .refine(esPeriodoMensual, "Usa aaaa-mm.")
  .optional()
  .describe("Mes consultado (aaaa-mm). Por defecto, el mes en curso de la empresa.");

export const scorecardsGet = defineCapability({
  id: "desempeno.scorecards.get",
  descripcion:
    "Scorecard de un cargo: qué indicadores se usan para medir su gestión, con qué meta mensual y qué peso. Devuelve la versión que rige en el mes consultado y, si existe, la que está pendiente (un borrador o una versión publicada que empieza a regir más adelante).",
  permiso: PERMISOS_DESEMPENO.scorecardsRead,
  input: z.object({ cargoId: uuidSchema, periodo }),
  output: z.object({
    cargoId: z.string(),
    periodo: z.string(),
    vigente: scorecardSchema.nullable().describe("null = el cargo no tiene scorecard en ese mes."),
    pendiente: scorecardSchema.nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const cargo = await ctx.db.cargo.findUnique({ where: { id: input.cargoId }, select: { id: true } });
    if (!cargo) throw noEncontrado("El cargo");
    const { actual } = await mesesDe(ctx);
    const mes = input.periodo ?? actual;
    const versiones = await versionesDe(ctx, input.cargoId);
    const vigente = versionVigente(versiones, mes);
    // Pendiente respecto de hoy, no del mes consultado: un borrador o lo que rige más adelante.
    const pendiente =
      versiones
        .filter((v) => v.id !== vigente?.id && (v.estado === "borrador" || v.vigenteDesde > actual))
        .sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? 1 : -1))[0] ?? null;
    return { cargoId: input.cargoId, periodo: mes, vigente, pendiente };
  },
});

export const scorecardsList = defineCapability({
  id: "desempeno.scorecards.list",
  descripcion:
    "Resumen del scorecard de cada cargo activo de la empresa en el mes en curso: cuántos indicadores tiene la versión vigente, desde cuándo rige y si hay cambios pendientes. Sirve para ver qué cargos ya tienen su gestión definida y cuáles faltan.",
  permiso: PERMISOS_DESEMPENO.scorecardsRead,
  input: z.object({}),
  output: z.array(
    z.object({
      cargoId: z.string(),
      cargo: z.string(),
      vigenteDesde: z.string().nullable().describe("null = sin scorecard vigente."),
      indicadores: z.number(),
      pendiente: z.boolean().describe("Hay un borrador o una versión que rige más adelante."),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [{ actual }, cargos, filas] = await Promise.all([
      mesesDe(ctx),
      ctx.db.cargo.findMany({
        where: { activo: true },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: { id: true, nombre: true },
      }),
      ctx.db.desempenoScorecard.findMany({ include: { indicadores: true } }),
    ]);
    const versiones = filas.map(vistaScorecard);
    return cargos.map((c) => {
      const propias = versiones.filter((v) => v.cargoId === c.id);
      const vigente = versionVigente(propias, actual);
      return {
        cargoId: c.id,
        cargo: c.nombre,
        vigenteDesde: vigente?.vigenteDesde ?? null,
        indicadores: vigente?.indicadores.length ?? 0,
        pendiente: propias.some((v) => v.estado === "borrador" || v.vigenteDesde > actual),
      };
    });
  },
});
