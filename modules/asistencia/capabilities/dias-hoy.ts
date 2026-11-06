import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { TIPOS_JORNADA } from "../domain";
import { calcularDia, fechaDe } from "./dias-calculo";
import { PORTALES } from "./dias-capacidades";
import { uuid } from "./esquemas";
import { tenantBasico, nombreCompleto } from "./formato";
import { alcanceMarcas } from "./lecturas";

const LIMITE = 300;
const ESTADOS = ["presente", "sin_marca", "ausente", "sin_turno", "incompleto"] as const;

const itemSchema = z.object({
  personaId: z.string(), nombre: z.string(), instalacionId: z.string().nullable(), instalacion: z.string().nullable(),
  turnoInicio: z.string().nullable(), turnoFin: z.string().nullable(), entrada: z.string().nullable(), salida: z.string().nullable(),
  estado: z.enum(ESTADOS), sigla: z.string().nullable(), atrasoMin: z.number().int(), tipoJornada: z.enum(TIPOS_JORNADA),
  correccionPendiente: z.boolean(), descansoInsuficiente: z.boolean(),
});

/** «Asistencia de hoy»: presentes, sin marca, atrasos y correcciones pendientes de los turnos del día. */
export const hoyListar = defineCapability({
  id: "asistencia.hoy.listar",
  descripcion:
    "Muestra la asistencia de hoy de los turnos esperados: quién está presente, quién no marcó, atrasos al segundo, jornadas incompletas y correcciones pendientes, con el resumen del día. El supervisor ve solo sus instalaciones.",
  permiso: null,
  portales: PORTALES,
  input: z.object({ instalacionId: uuid.optional(), estado: z.enum(ESTADOS).optional() }),
  output: z.object({
    fecha: z.string(),
    resumen: z.object({ turnos: z.number().int(), presentes: z.number().int(), sinMarca: z.number().int(), ausentes: z.number().int(), incompletos: z.number().int(), atrasos: z.number().int() }),
    items: z.array(itemSchema), truncado: z.boolean(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.map((d) => d.personaId))],
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const { zona } = await tenantBasico(ctx);
    const ahora = new Date();
    const hoy = fechaDe(ahora, zona);
    const turnos = await ctx.db.turnoEsperado.findMany({
      where: { vigente: true, fecha: new Date(`${hoy}T00:00:00Z`), AND: [alcance, i.instalacionId ? { instalacionId: i.instalacionId } : {}] },
      orderBy: { inicio: "asc" }, take: LIMITE + 1,
    });
    const visibles = turnos.slice(0, LIMITE);
    const personas = [...new Set(visibles.map((t) => t.personaId))];
    const [nombres, insts] = await Promise.all([
      ctx.db.persona.findMany({ where: { id: { in: personas } }, select: { id: true, nombres: true, apellidos: true } }),
      ctx.db.instalacion.findMany({ where: { id: { in: [...new Set(visibles.map((t) => t.instalacionId))] } }, select: { id: true, nombre: true } }),
    ]);
    const nombre = new Map(nombres.map((p) => [p.id, nombreCompleto(p)]));
    const instalacion = new Map(insts.map((x) => [x.id, x.nombre]));
    const vistos = new Set<string>();
    const items: z.infer<typeof itemSchema>[] = [];
    for (const t of visibles) {
      if (vistos.has(t.personaId)) continue;
      vistos.add(t.personaId);
      const d = await calcularDia(ctx, t.personaId, hoy, ahora, zona);
      items.push({
        personaId: t.personaId, nombre: nombre.get(t.personaId) ?? "", instalacionId: d.instalacionId, instalacion: d.instalacionId ? (instalacion.get(d.instalacionId) ?? null) : null,
        turnoInicio: d.turno?.inicio.toISOString() ?? null, turnoFin: d.turno?.fin.toISOString() ?? null,
        entrada: d.entrada?.toISOString() ?? null, salida: d.salida?.toISOString() ?? null, estado: d.estado, sigla: d.sigla,
        atrasoMin: Math.floor(d.segundosAtraso / 60), tipoJornada: d.tipoJornada, correccionPendiente: d.correccionPendiente, descansoInsuficiente: d.descansoInsuficiente,
      });
    }
    const filtrados = i.estado ? items.filter((x) => x.estado === i.estado) : items;
    const cuenta = (e: (typeof ESTADOS)[number]) => items.filter((x) => x.estado === e).length;
    return {
      fecha: hoy,
      resumen: { turnos: items.length, presentes: cuenta("presente"), sinMarca: cuenta("sin_marca"), ausentes: cuenta("ausente"), incompletos: cuenta("incompleto"), atrasos: items.filter((x) => x.atrasoMin > 0).length },
      items: filtrados, truncado: turnos.length > LIMITE,
    };
  },
});
