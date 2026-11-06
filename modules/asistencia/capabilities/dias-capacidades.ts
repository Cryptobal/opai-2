import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { esTipoJornada, TIPOS_JORNADA } from "../domain";
import { uuid } from "./esquemas";
import { alcanceMarcas } from "./lecturas";

export const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD.");
export const PORTALES = ["erp", "supervisor"] as const;
export const dia = (f: string) => new Date(`${f}T00:00:00Z`);
const MAX_DIAS = 93;
const MAX_FILAS = 20_000;

export const diaSchema = z.object({
  personaId: z.string(), fecha: z.string(), instalacionId: z.string().nullable(), tipoJornada: z.enum(TIPOS_JORNADA),
  estado: z.enum(["presente", "sin_marca", "ausente", "sin_turno", "incompleto"]), sigla: z.string().nullable(),
  minutosTrabajados: z.number().int(), segundosAtraso: z.number().int(), segundosExtra: z.number().int(),
  segundosSalidaAnticipada: z.number().int(), descansoInsuficiente: z.boolean(), correccionPendiente: z.boolean(),
  entrada: z.string().nullable(), salida: z.string().nullable(),
});
type DiaFila = {
  personaId: string; fecha: Date; instalacionId: string | null; tipoJornada: string; estado: string; sigla: string | null;
  minutosTrabajados: number; segundosAtraso: number; segundosExtra: number; segundosSalidaAnticipada: number;
  descansoInsuficiente: boolean; correccionPendiente: boolean; entrada: Date | null; salida: Date | null;
};
export const vista = (d: DiaFila) => ({
  personaId: d.personaId, fecha: d.fecha.toISOString().slice(0, 10), instalacionId: d.instalacionId, tipoJornada: (esTipoJornada(d.tipoJornada) ? d.tipoJornada : "ordinaria") as (typeof TIPOS_JORNADA)[number],
  estado: d.estado as never, sigla: d.sigla, minutosTrabajados: d.minutosTrabajados, segundosAtraso: d.segundosAtraso,
  segundosExtra: d.segundosExtra, segundosSalidaAnticipada: d.segundosSalidaAnticipada, descansoInsuficiente: d.descansoInsuficiente,
  correccionPendiente: d.correccionPendiente, entrada: d.entrada?.toISOString() ?? null, salida: d.salida?.toISOString() ?? null,
});
const rango = z.object({ desde: fecha, hasta: fecha })
  .refine((i) => i.hasta >= i.desde, "«hasta» no puede ser anterior a «desde».")
  .refine((i) => Date.parse(i.hasta) - Date.parse(i.desde) <= MAX_DIAS * 86_400_000, `Como máximo ${MAX_DIAS} días.`);

export const diasListar = defineCapability({
  id: "asistencia.dias.listar",
  descripcion:
    "Lista el día consolidado de asistencia (estado, sigla oficial, minutos trabajados, atraso y sobretiempo al segundo, descanso y corrección pendiente) de una persona o una instalación en un rango de fechas. El trabajador ve solo lo suyo y el supervisor lo de sus instalaciones.",
  permiso: null,
  portales: [...PORTALES, "trabajador", "terreno"],
  input: rango.and(z.object({ personaId: uuid.optional(), instalacionId: uuid.optional() })),
  output: z.object({ items: z.array(diaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.map((d) => d.personaId))],
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const filas = await ctx.db.dia.findMany({
      where: { fecha: { gte: dia(i.desde), lte: dia(i.hasta) }, AND: [alcance, i.personaId ? { personaId: i.personaId } : {}, i.instalacionId ? { instalacionId: i.instalacionId } : {}] },
      orderBy: [{ fecha: "asc" }, { personaId: "asc" }], take: 1000,
    });
    return { items: filas.map(vista) };
  },
});

const resumenSchema = z.object({
  personaId: z.string(), dias: z.number().int(), presentes: z.number().int(), ausentes: z.number().int(), sinMarca: z.number().int(),
  incompletos: z.number().int(), minutosTrabajados: z.number().int(), segundosAtraso: z.number().int(), segundosExtra: z.number().int(),
  diasDescansoInsuficiente: z.number().int(),
  /** Hay correcciones pendientes: el resumen usa el valor original y puede cambiar. */
  provisorio: z.boolean(), siglas: z.record(z.string(), z.number().int()),
});

export const diasResumenPeriodo = defineCapability({
  id: "asistencia.dias.resumen_periodo",
  descripcion:
    "Resume por persona un período de asistencia (días presentes, ausentes y sin marca, minutos trabajados, atrasos y sobretiempo al segundo, siglas y descansos insuficientes). Es la fuente de Nómina; mientras una corrección está pendiente el resumen usa el valor original y se marca como provisorio.",
  permiso: "asistencia:reportes",
  portales: PORTALES,
  input: rango.and(z.object({ instalacionId: uuid.optional() })),
  output: z.object({ items: z.array(resumenSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((r) => r.personaId),
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const filas = await ctx.db.dia.findMany({
      where: { fecha: { gte: dia(i.desde), lte: dia(i.hasta) }, AND: [alcance, i.instalacionId ? { instalacionId: i.instalacionId } : {}] },
      take: MAX_FILAS + 1,
    });
    if (filas.length > MAX_FILAS) throw reglaDeNegocio("El período es demasiado grande: acótalo por instalación o por fechas.");
    const por = new Map<string, z.infer<typeof resumenSchema>>();
    for (const d of filas) {
      const r = por.get(d.personaId) ?? { personaId: d.personaId, dias: 0, presentes: 0, ausentes: 0, sinMarca: 0, incompletos: 0, minutosTrabajados: 0, segundosAtraso: 0, segundosExtra: 0, diasDescansoInsuficiente: 0, provisorio: false, siglas: {} };
      r.dias += 1;
      if (d.estado === "presente") r.presentes += 1;
      if (d.estado === "ausente") r.ausentes += 1;
      if (d.estado === "sin_marca") r.sinMarca += 1;
      if (d.estado === "incompleto") r.incompletos += 1;
      r.minutosTrabajados += d.minutosTrabajados;
      r.segundosAtraso += d.segundosAtraso;
      r.segundosExtra += d.segundosExtra;
      if (d.descansoInsuficiente) r.diasDescansoInsuficiente += 1;
      if (d.correccionPendiente) r.provisorio = true;
      if (d.sigla) r.siglas[d.sigla] = (r.siglas[d.sigla] ?? 0) + 1;
      por.set(d.personaId, r);
    }
    return { items: [...por.values()] };
  },
});
