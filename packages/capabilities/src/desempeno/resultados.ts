import { versionVigente } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { resultadosDe } from "./calculo";
import { mesesDe, periodo, PERMISOS_DESEMPENO, versionesDe } from "./comun";
import { visibilidadDe, visiblesEntre } from "./visibilidad";

const MAX = 200;
const puntaje = z
  .number()
  .nullable()
  .describe("0 a 120; 100 = todas las metas cumplidas. null = sin hechos que medir todavía.");
const cobertura = z.number().describe("Peso del scorecard que sí tuvo hechos este mes (0 a 100).");

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
    const base = { personaId, nombres, apellidos, cargoId: vinculo?.cargoId ?? null, periodo: mes };
    const sinScorecard = { ...base, vigenteDesde: null, puntaje: null, cobertura: 0, indicadores: [] };
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

export const resultadosCargo = defineCapability({
  id: "desempeno.resultados.ver_cargo",
  descripcion:
    "Resultado de gestión de las personas de un cargo en un mes: el puntaje de cada una (0 a 120) según el scorecard del cargo. Cada jefatura ve solo a las personas a su cargo; gerencia ve a todas. Entrega hasta 200 personas por respuesta; si hay más, `siguiente` dice desde dónde seguir.",
  permiso: PERMISOS_DESEMPENO.resultadosVer,
  input: z.object({
    cargoId: uuidSchema,
    periodo,
    despuesDe: uuidSchema.optional().describe("Para seguir: el valor `siguiente` anterior."),
  }),
  output: z.object({
    cargoId: z.string(),
    periodo: z.string(),
    vigenteDesde: z.string().nullable().describe("null = el cargo no tiene scorecard ese mes."),
    personas: z.array(
      z.object({ personaId: z.string(), nombres: z.string(), apellidos: z.string(), puntaje, cobertura }),
    ),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.personas.map((p) => p.personaId),
  async handler(ctx, input) {
    const cargo = await ctx.db.cargo.findUnique({ where: { id: input.cargoId }, select: { id: true } });
    if (!cargo) throw noEncontrado("El cargo");
    const [meses, vis, vinculos] = await Promise.all([
      mesesDe(ctx),
      visibilidadDe(ctx),
      ctx.db.vinculoLaboral.findMany({
        where: { cargoId: input.cargoId, estado: "vigente", persona: { estado: "activa" } },
        select: { personaId: true },
      }),
    ]);
    const mes = input.periodo ?? meses.actual;
    const scorecard = versionVigente(await versionesDe(ctx, input.cargoId), mes);
    const base = { cargoId: input.cargoId, periodo: mes, vigenteDesde: scorecard?.vigenteDesde ?? null };
    if (!scorecard) return { ...base, personas: [], siguiente: null };
    const delCargo = vinculos.map((v) => v.personaId);
    const visibles = await visiblesEntre(ctx, vis, delCargo);
    // Quien consulta también aparece si es de este cargo y puede ver su propio resultado.
    if (vis.propia && delCargo.includes(vis.propia) && (vis.todos || scorecard.personaVeResultado)) {
      visibles.add(vis.propia);
    }
    const orden = [...visibles].filter((id) => !input.despuesDe || id > input.despuesDe).sort();
    const pagina = orden.slice(0, MAX);
    const personas = await ctx.db.persona.findMany({
      where: { id: { in: pagina } },
      select: { id: true, nombres: true, apellidos: true, usuarioId: true },
    });
    const resultados = await resultadosDe(ctx, scorecard, personas, mes, meses.zona);
    return {
      ...base,
      personas: personas
        .map((p) => ({
          personaId: p.id,
          nombres: p.nombres,
          apellidos: p.apellidos,
          puntaje: resultados.get(p.id)?.puntaje ?? null,
          cobertura: resultados.get(p.id)?.cobertura ?? 0,
        }))
        .sort((a, b) => (a.personaId < b.personaId ? -1 : 1)),
      siguiente: orden.length > MAX ? (pagina.at(-1) ?? null) : null,
    };
  },
});
