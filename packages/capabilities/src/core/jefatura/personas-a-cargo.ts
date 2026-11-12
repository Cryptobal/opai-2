import { PERMISOS_CORE } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import { equipoDe, personaDelUsuario } from "./datos";

const MAX = 200;

export const personasACargoList = defineCapability({
  id: "core.personas.list_a_cargo",
  descripcion:
    "Personas a cargo de un jefe según la jefatura de cada cargo: las que le reportan directamente y, hacia abajo, toda su línea. Sin indicar a quién, responde por quien consulta. De a 200 por respuesta. Sirve para saber a quién puede ver o aprobar un jefe.",
  permiso: PERMISOS_CORE.personasRead,
  input: z.object({
    personaId: uuidSchema
      .optional()
      .describe("Jefe por el que se pregunta. Por defecto, la Persona de quien consulta."),
    despuesDe: uuidSchema.optional().describe("Para seguir: el valor `siguiente` anterior."),
  }),
  output: z.object({
    jefePersonaId: z.string().nullable().describe("null = quien consulta no tiene ficha de Persona."),
    personas: z.array(
      z.object({
        id: z.string(),
        nombres: z.string(),
        apellidos: z.string(),
        cargoId: z.string().nullable(),
        directa: z.boolean().describe("true si le reporta directamente; false si es por su línea."),
      }),
    ),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  // Revela quién depende de quién: se auditan los ids de la página entregada.
  auditarLectura: (salida) => salida.personas.map((p) => p.id),
  async handler(ctx, input) {
    const propia = await personaDelUsuario(ctx);
    const jefeId = input.personaId ?? propia;
    // Con alcance por filas (ADR-022) solo se consulta el equipo propio.
    if (ctx.alcance !== null && jefeId !== propia) {
      throw prohibido("Con tu alcance solo puedes ver a las personas a tu cargo.");
    }
    if (!jefeId) return { jefePersonaId: null, personas: [], siguiente: null };
    const equipo = await equipoDe(ctx, jefeId);
    // La jefatura nunca amplía el alcance por filas (ADR-022): quien está acotado a sus
    // instalaciones ve, de su equipo, solo a quienes ya puede ver como persona.
    const visibles =
      ctx.alcance === null || equipo.ids.size === 0
        ? equipo.ids
        : new Set(
            (
              await ctx.db.persona.findMany({
                where: { id: { in: [...equipo.ids] }, ...dondePersona(ctx) },
                select: { id: true },
              })
            ).map((p) => p.id),
          );
    const orden = [...visibles].filter((id) => !input.despuesDe || id > input.despuesDe).sort();
    const pagina = orden.slice(0, MAX);
    const [personas, vinculos] = await Promise.all([
      ctx.db.persona.findMany({
        where: { id: { in: pagina } },
        select: { id: true, nombres: true, apellidos: true },
      }),
      ctx.db.vinculoLaboral.findMany({
        where: { personaId: { in: pagina }, estado: "vigente" },
        select: { personaId: true, cargoId: true },
      }),
    ]);
    const cargoDe = new Map(vinculos.map((v) => [v.personaId, v.cargoId]));
    return {
      jefePersonaId: jefeId,
      personas: personas
        .map((p) => ({
          ...p,
          cargoId: cargoDe.get(p.id) ?? null,
          directa: equipo.directas.has(p.id),
        }))
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
      siguiente: orden.length > MAX ? (pagina.at(-1) ?? null) : null,
    };
  },
});
