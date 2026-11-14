import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import { horasDeTurnoEsperado } from "@opai/domain";

import { personaPropia } from "./persona-propia";

const DIAS_MAX = 62;
const fechaCivil = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha va como aaaa-mm-dd.");

const turnoSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  inicio: z.string(),
  fin: z.string(),
  horas: z.number(),
  feriado: z.boolean(),
  origen: z.enum(["pauta", "jornada_pactada", "manual"]),
  instalacion: z.object({ id: z.string(), nombre: z.string() }),
  puesto: z.string().nullable(),
});
export type MiTurno = z.output<typeof turnoSchema>;

const sumarDias = (dia: string, n: number) =>
  new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Los turnos de la propia persona del trabajador (CAR-462, parte 1 de CAR-357): salen de los turnos esperados del
 * núcleo (`core.turnos_esperados`, los mismos que usa Asistencia), así que incluyen reemplazos, refuerzos y jornada
 * pactada. Ningún input trae un id de persona: el alcance es la persona vinculada al usuario, en la consulta (ADR-022).
 */
export const misTurnosListar = defineCapability({
  id: "portal_trabajador.mis_turnos.listar",
  descripcion:
    "Lista los turnos de la propia persona del trabajador desde una fecha (por defecto hoy, en la zona de la empresa): día, hora de inicio y fin, horas, si es feriado, instalación y puesto. Solo los suyos, nunca los de otra persona. Paginada por cursor.",
  permiso: null,
  portales: ["trabajador"],
  auditarLectura: (s) => [s.personaId],
  input: z.object({
    desde: fechaCivil.optional().describe("Primer día (aaaa-mm-dd). Por defecto, hoy en la zona de la empresa."),
    dias: z.number().int().min(1).max(DIAS_MAX).default(28).describe(`Cuántos días desde «desde» (1 a ${DIAS_MAX}).`),
    cursor: z.uuid().optional().describe("Id del último turno de la página anterior."),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({
    personaId: z.string(),
    zona: z.string(),
    hoy: z.string().describe("Hoy (aaaa-mm-dd) en la zona de la empresa."),
    desde: z.string(),
    hasta: z.string(),
    items: z.array(turnoSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const persona = await personaPropia(ctx);
    const tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } });
    const zona = tenant?.timezone ?? "America/Santiago";
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date());
    const desde = input.desde ?? hoy;
    const hasta = sumarDias(desde, input.dias - 1);
    const filas = await ctx.db.turnoEsperado.findMany({
      where: {
        personaId: persona.id,
        vigente: true,
        fecha: { gte: new Date(`${desde}T00:00:00Z`), lte: new Date(`${hasta}T00:00:00Z`) },
      },
      orderBy: [{ inicio: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const pagina = filas.slice(0, input.limite);
    const siguiente = filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null;
    const [instalaciones, puestos] = await Promise.all([
      ctx.db.instalacion.findMany({
        where: { id: { in: [...new Set(pagina.map((f) => f.instalacionId))] } },
        select: { id: true, nombre: true },
      }),
      ctx.db.puesto.findMany({
        where: { id: { in: [...new Set(pagina.flatMap((f) => (f.puestoId ? [f.puestoId] : [])))] } },
        select: { id: true, nombre: true },
      }),
    ]);
    const nombreInst = new Map(instalaciones.map((i) => [i.id, i.nombre]));
    const nombrePuesto = new Map(puestos.map((p) => [p.id, p.nombre]));
    return {
      personaId: persona.id,
      zona,
      hoy,
      desde,
      hasta,
      siguiente,
      items: pagina.map((f) => ({
        id: f.id,
        fecha: f.fecha.toISOString().slice(0, 10),
        inicio: f.inicio.toISOString(),
        fin: f.fin.toISOString(),
        horas: Math.round(horasDeTurnoEsperado(f) * 100) / 100,
        feriado: f.feriado,
        origen: f.origen as MiTurno["origen"],
        instalacion: { id: f.instalacionId, nombre: nombreInst.get(f.instalacionId) ?? "Instalación" },
        puesto: f.puestoId ? (nombrePuesto.get(f.puestoId) ?? null) : null,
      })),
    };
  },
});
