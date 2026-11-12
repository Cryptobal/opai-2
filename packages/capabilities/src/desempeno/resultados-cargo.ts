import { versionVigente } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { resultadosDe } from "./calculo";
import { estaCerrado } from "./cierre-lectura";
import { deMesCerrado } from "./resultados-cargo-cerrado";
import { mesesDe, periodo, PERMISOS_DESEMPENO, versionesDe } from "./comun";
import { cobertura, MAX_PERSONAS as MAX, puntaje } from "./resultados";
import { visibilidadDe, visiblesEntre } from "./visibilidad";

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
    cerrado: z.boolean().describe("true = mes cerrado: personas y puntajes son los que quedaron guardados."),
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
    if (await estaCerrado(ctx, mes)) return deMesCerrado(ctx, input.cargoId, mes, vis, input.despuesDe);
    const scorecard = versionVigente(await versionesDe(ctx, input.cargoId), mes);
    const base = { cargoId: input.cargoId, periodo: mes, cerrado: false, vigenteDesde: scorecard?.vigenteDesde ?? null };
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
