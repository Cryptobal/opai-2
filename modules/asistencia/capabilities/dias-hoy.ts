import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { TIPOS_JORNADA } from "../domain";
import { calcularDia, fechaDe } from "./dias-calculo";
import { PORTALES } from "./dias-capacidades";
import { uuid } from "./esquemas";
import { tenantBasico, nombreCompleto } from "./formato";
import { alcanceMarcas } from "./lecturas";

const ESTADOS = ["presente", "sin_marca", "ausente", "sin_turno", "incompleto"] as const;

const itemSchema = z.object({
  personaId: z.string(), nombre: z.string(), instalacionId: z.string().nullable(), instalacion: z.string().nullable(),
  turnoInicio: z.string().nullable(), turnoFin: z.string().nullable(), entrada: z.string().nullable(), salida: z.string().nullable(),
  estado: z.enum(ESTADOS), sigla: z.string().nullable(), atrasoMin: z.number().int(), tipoJornada: z.enum(TIPOS_JORNADA),
  correccionPendiente: z.boolean(), descansoInsuficiente: z.boolean(), marcaFueraDeTurno: z.boolean(),
});

async function idsBusqueda(
  ctx: { db: { persona: { findMany: Function }; instalacion: { findMany: Function } } },
  q: string,
  personasBase: string[] | undefined,
) {
  const t = q.trim();
  if (t.length < 2) return null;
  const [personas, insts] = await Promise.all([
    ctx.db.persona.findMany({
      where: {
        AND: [
          personasBase ? { id: { in: personasBase } } : {},
          { OR: [{ nombres: { contains: t, mode: "insensitive" } }, { apellidos: { contains: t, mode: "insensitive" } }] },
        ],
      },
      select: { id: true }, take: 200,
    }),
    ctx.db.instalacion.findMany({ where: { nombre: { contains: t, mode: "insensitive" } }, select: { id: true }, take: 50 }),
  ]);
  return { personaIds: personas.map((p: { id: string }) => p.id), instalacionIds: insts.map((x: { id: string }) => x.id) };
}

/** «Asistencia de hoy»: presentes, sin marca, atrasos y correcciones pendientes de los turnos del día. */
export const hoyListar = defineCapability({
  id: "asistencia.dias.hoy",
  descripcion:
    "Muestra la asistencia de hoy de los turnos esperados: quién está presente, quién no marcó, atrasos al segundo, jornadas incompletas y correcciones pendientes, con el resumen del día. Busca por nombre de persona o instalación. Paginada por cursor (personaId de la fila anterior).",
  permiso: null,
  portales: PORTALES,
  input: z.object({
    instalacionId: uuid.optional(),
    estado: z.enum(ESTADOS).optional(),
    q: z.string().trim().max(100).optional(),
    cursor: z.string().uuid().optional(),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    fecha: z.string(), zona: z.string(),
    resumen: z.object({ turnos: z.number().int(), presentes: z.number().int(), sinMarca: z.number().int(), ausentes: z.number().int(), incompletos: z.number().int(), atrasos: z.number().int() }),
    items: z.array(itemSchema), siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.map((d) => d.personaId))],
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const { zona } = await tenantBasico(ctx);
    const ahora = new Date();
    const hoy = fechaDe(ahora, zona);
    const busqueda = i.q ? await idsBusqueda(ctx, i.q, undefined) : null;
    if (busqueda && !busqueda.personaIds.length && !busqueda.instalacionIds.length) {
      return {
        fecha: hoy, zona,
        resumen: { turnos: 0, presentes: 0, sinMarca: 0, ausentes: 0, incompletos: 0, atrasos: 0 },
        items: [], siguiente: null,
      };
    }
    const turnosTodos = await ctx.db.turnoEsperado.findMany({
      where: {
        vigente: true, fecha: new Date(`${hoy}T00:00:00Z`), AND: [
          alcance,
          i.instalacionId ? { instalacionId: i.instalacionId } : {},
          busqueda ? {
            OR: [
              ...(busqueda.personaIds.length ? [{ personaId: { in: busqueda.personaIds } }] : []),
              ...(busqueda.instalacionIds.length ? [{ instalacionId: { in: busqueda.instalacionIds } }] : []),
            ],
          } : {},
        ],
      },
      orderBy: [{ inicio: "asc" }, { id: "asc" }],
    });
    const vistosResumen = new Set<string>();
    const itemsResumen: z.infer<typeof itemSchema>[] = [];
    const instIds = [...new Set(turnosTodos.map((t) => t.instalacionId))];
    const [nombres, insts] = await Promise.all([
      ctx.db.persona.findMany({ where: { id: { in: [...new Set(turnosTodos.map((t) => t.personaId))] } }, select: { id: true, nombres: true, apellidos: true } }),
      ctx.db.instalacion.findMany({ where: { id: { in: instIds } }, select: { id: true, nombre: true } }),
    ]);
    const nombre = new Map(nombres.map((p) => [p.id, nombreCompleto(p)]));
    const instalacion = new Map(insts.map((x) => [x.id, x.nombre]));
    for (const t of turnosTodos) {
      if (vistosResumen.has(t.personaId)) continue;
      vistosResumen.add(t.personaId);
      const d = await calcularDia(ctx, t.personaId, hoy, ahora, zona, ctx.alcance ? [...ctx.alcance.instalaciones] : undefined);
      itemsResumen.push({
        personaId: t.personaId, nombre: nombre.get(t.personaId) ?? "", instalacionId: d.instalacionId, instalacion: d.instalacionId ? (instalacion.get(d.instalacionId) ?? null) : null,
        turnoInicio: d.turno?.inicio.toISOString() ?? null, turnoFin: d.turno?.fin.toISOString() ?? null,
        entrada: d.entrada?.toISOString() ?? null, salida: d.salida?.toISOString() ?? null, estado: d.estado, sigla: d.sigla,
        atrasoMin: Math.floor(d.segundosAtraso / 60), tipoJornada: d.tipoJornada, correccionPendiente: d.correccionPendiente, descansoInsuficiente: d.descansoInsuficiente, marcaFueraDeTurno: d.marcaFueraDeTurno,
      });
    }
    const cuenta = (e: (typeof ESTADOS)[number]) => itemsResumen.filter((x) => x.estado === e).length;
    const resumen = {
      turnos: itemsResumen.length, presentes: cuenta("presente"), sinMarca: cuenta("sin_marca"), ausentes: cuenta("ausente"),
      incompletos: cuenta("incompleto"), atrasos: itemsResumen.filter((x) => x.atrasoMin > 0).length,
    };
    const filtrados = i.estado ? itemsResumen.filter((x) => x.estado === i.estado) : itemsResumen;
    let inicio = 0;
    if (i.cursor) {
      const ix = filtrados.findIndex((x) => x.personaId === i.cursor);
      if (ix >= 0) inicio = ix + 1;
    }
    const items = filtrados.slice(inicio, inicio + i.limite);
  return {
      fecha: hoy, zona, resumen, items,
      siguiente: filtrados.length > inicio + i.limite ? (items.at(-1)?.personaId ?? null) : null,
    };
  },
});