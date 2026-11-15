import { z } from "zod";

import { horasDeTurnoEsperado, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { fechaCivilSchema, dondeInstalacionId } from "../calendario/comun";
import { cursorDe, pagina } from "../maestros/comun";

const MAX_DIAS = 62;
export const dias = (d: string, h: string) =>
  Math.round((Date.parse(h) - Date.parse(d)) / 86_400_000) + 1;

const turnoSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  fecha: z.string(),
  inicio: z.string(),
  fin: z.string(),
  instalacionId: z.string(),
  puestoId: z.string().nullable(),
  origen: z.enum(["pauta", "jornada_pactada", "manual"]),
  referencia: z.string().nullable(),
  colacionMin: z.number().int(),
  feriado: z.boolean(),
  horasEsperadas: z.number(),
  version: z.number().int(),
  vigente: z.boolean(),
});

export const turnosEsperadosListar = defineCapability({
  id: "core.turnos_esperados.listar",
  descripcion:
    "Lista los turnos esperados (qué turno le toca a cada persona cada día, con inicio y fin exactos y su origen: pauta, jornada pactada o manual) de una instalación o de una persona en un rango de fechas. Respeta el alcance del supervisor. Paginada por cursor, por hora de inicio.",
  permiso: PERMISOS_CORE.personasLaboralRead,
  // CAR-353: contrato único de listas (cursor + limite; items + siguiente). Antes cortaba en 2.000
  // filas con una marca «truncado»; ahora se recorre página a página sin perder turnos.
  input: z
    .object({
      instalacionId: uuidSchema.optional(),
      personaId: uuidSchema.optional(),
      incluirNoVigentes: z.boolean().default(false),
      desde: fechaCivilSchema,
      hasta: fechaCivilSchema,
      cursor: z.uuid().optional().describe("Id del último turno de la página anterior."),
      limite: z.number().int().min(1).max(200).default(200),
    })
    .refine((i) => i.instalacionId || i.personaId, "Indica una instalación o una persona.")
    .refine((r) => r.hasta >= r.desde, "«hasta» no puede ser anterior a «desde».")
    .refine(
      (r) => dias(r.desde, r.hasta) <= MAX_DIAS,
      `Como máximo ${MAX_DIAS} días por consulta.`,
    ),
  output: z.object({ items: z.array(turnoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((t) => t.personaId),
  async handler(ctx, input) {
    const filas = await ctx.db.turnoEsperado.findMany({
      where: {
        fecha: {
          gte: new Date(`${input.desde}T00:00:00.000Z`),
          lte: new Date(`${input.hasta}T00:00:00.000Z`),
        },
        ...(input.incluirNoVigentes ? {} : { vigente: true }),
        // El alcance del supervisor se combina con el filtro pedido (AND), nunca lo reemplaza.
        AND: [
          dondeInstalacionId(ctx),
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
        ],
        ...(input.personaId ? { personaId: input.personaId } : {}),
      },
      orderBy: [{ inicio: "asc" }, { version: "asc" }, { id: "asc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    return {
      siguiente,
      items: items.map((f) => ({
        id: f.id,
        personaId: f.personaId,
        fecha: f.fecha.toISOString().slice(0, 10),
        inicio: f.inicio.toISOString(),
        fin: f.fin.toISOString(),
        instalacionId: f.instalacionId,
        puestoId: f.puestoId,
        origen: f.origen as "pauta" | "jornada_pactada" | "manual",
        referencia: f.referencia,
        colacionMin: f.colacionMin,
        feriado: f.feriado,
        horasEsperadas: Math.round(horasDeTurnoEsperado(f) * 100) / 100,
        version: f.version,
        vigente: f.vigente,
      })),
    };
  },
});
