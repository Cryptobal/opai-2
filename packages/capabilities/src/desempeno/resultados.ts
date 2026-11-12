import { versionVigente } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { resultadosDe } from "./calculo";
import { estaCerrado, personaCerrada } from "./cierre-lectura";
import { mesesDe, periodo, PERMISOS_DESEMPENO, versionesDe } from "./comun";
import { visibilidadDe, visiblesEntre } from "./visibilidad";

export const MAX_PERSONAS = 200;
export const puntaje = z
  .number()
  .nullable()
  .describe("0 a 120; 100 = todas las metas cumplidas. null = sin hechos que medir todavía.");
export const cobertura = z.number().describe("Peso del scorecard que sí tuvo hechos este mes (0 a 100).");

export const resultadosPersona = defineCapability({
  id: "desempeno.resultados.ver_persona",
  descripcion:
    "Resultado de gestión de una persona en un mes: su puntaje (0 a 120, 100 es cumplir todas las metas) y el detalle por indicador con meta, valor y logro, según el scorecard de su cargo. Sin indicar a quién, responde por quien consulta. Cada uno ve el suyo y el de las personas a su cargo; gerencia ve a todos.",
  permiso: PERMISOS_DESEMPENO.resultadosVer,
  input: z.object({
    personaId: uuidSchema.optional().describe("Por defecto, la Persona de quien consulta."),
    periodo,
  }),
  output: z.object({
    personaId: z.string(),
    nombres: z.string(),
    apellidos: z.string(),
    cargoId: z.string().nullable(),
    periodo: z.string(),
    vigenteDesde: z.string().nullable().describe("null = su cargo no tiene scorecard ese mes."),
    cerrado: z.boolean().describe("true = mes cerrado: el resultado es el que quedó guardado y no cambia."),
    puntaje,
    cobertura,
    indicadores: z.array(
      z.object({
        indicador: z.string(),
        nombre: z.string(),
        unidad: z.string().nullable(),
        meta: z.number(),
        peso: z.number(),
        valor: z.number().nullable(),
        logro: z.number().nullable(),
        disponible: z.boolean(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  // Revela el resultado de gestión de una persona: se audita su id, nunca los valores.
  auditarLectura: (salida) => [salida.personaId],
  async handler(ctx, input) {
    const vis = await visibilidadDe(ctx);
    const personaId = input.personaId ?? vis.propia;
    if (!personaId) {
      throw reglaDeNegocio("Tu usuario no está vinculado a una ficha de Persona: indica a quién consultar.");
    }
    const persona = await ctx.db.persona.findFirst({
      where: { id: personaId, anonimizadaEn: null },
      select: { id: true, usuarioId: true, nombres: true, apellidos: true },
    });
    const esPropia = personaId === vis.propia;
    // Fuera de lo que puede ver responde igual que una persona inexistente.
    if (!persona || (!esPropia && !(await visiblesEntre(ctx, vis, [personaId])).has(personaId))) {
      throw noEncontrado("La persona");
    }
    const [meses, vinculo] = await Promise.all([
      mesesDe(ctx),
      ctx.db.vinculoLaboral.findFirst({
        where: { personaId, estado: "vigente" },
        select: { cargoId: true },
      }),
    ]);
    const mes = input.periodo ?? meses.actual;
    const { nombres, apellidos } = persona;
    const cerrado = await estaCerrado(ctx, mes);
    const base = { personaId, nombres, apellidos, cargoId: vinculo?.cargoId ?? null, periodo: mes, cerrado };
    const sinScorecard = { ...base, vigenteDesde: null, puntaje: null, cobertura: 0, indicadores: [] };
    if (cerrado) {
      // Mes cerrado: lo guardado, con el cargo y el scorecard que tenía ese mes.
      const g = await personaCerrada(ctx, personaId, mes);
      if (!g) return { ...sinScorecard, cargoId: null };
      if (esPropia && !vis.todos && !g.personaVeResultado) {
        throw prohibido("Tu empresa no muestra el resultado propio para este cargo.");
      }
      const { personaVeResultado: _ve, scorecardId: _s, ...guardado } = g;
      return { ...base, ...guardado };
    }
    if (!vinculo) return sinScorecard;
    const scorecard = versionVigente(await versionesDe(ctx, vinculo.cargoId), mes);
    if (!scorecard) return sinScorecard;
    if (esPropia && !vis.todos && !scorecard.personaVeResultado) {
      throw prohibido("Tu empresa no muestra el resultado propio para este cargo.");
    }
    const r = (await resultadosDe(ctx, scorecard, [persona], mes, meses.zona)).get(personaId);
    return { ...base, vigenteDesde: scorecard.vigenteDesde, ...(r ?? sinScorecard) };
  },
});
