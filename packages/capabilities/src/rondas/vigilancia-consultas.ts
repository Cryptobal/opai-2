import { ocurrenciasProgramacion, type HorarioRonda, type RondaVigilada } from "@opai/domain";

import { senalRonda } from "../core/terreno/rondas-senales";
import type { Contexto } from "../types";

const MIN_MS = 60_000;
/** Ronda más larga posible (tiempo máximo de plantilla, 480 min) más la hora revisada y una de margen. */
const VENTANA_RONDA_MS = 10 * 60 * MIN_MS;

export type Senal = {
  tipo: "rondas.ejecucion.no_realizada" | "rondas.ejecucion.atrasada" | "rondas.punto.omitido";
  entidadTipo: string;
  entidadId: string;
  payload: Record<string, unknown>;
};

const fecha = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Persona responsable cuando la programación nombra a una sola (la Central agrupa por persona). */
function responsableUnico(responsables: unknown): string | null {
  const r = responsables as { modo?: string; personaIds?: unknown };
  return r?.modo === "personas" && Array.isArray(r.personaIds) && r.personaIds.length === 1
    ? String(r.personaIds[0])
    : null;
}

/**
 * Rondas programadas cuya tolerancia venció en [desde, hasta) sin que nadie iniciara esa plantilla en la
 * instalación dentro de ±tolerancia de la hora pedida.
 */
export async function noRealizadas(ctx: Contexto, desde: Date, hasta: Date, zona: string) {
  const progs = await ctx.db.programacion.findMany({
    where: { estado: "activa", plantilla: { estado: "activo" } },
    select: {
      id: true,
      instalacionId: true,
      plantillaId: true,
      horarios: true,
      diasSemana: true,
      vigenciaDesde: true,
      vigenciaHasta: true,
      toleranciaMin: true,
      responsables: true,
    },
  });
  const senales: Senal[] = [];
  for (const p of progs) {
    const tol = p.toleranciaMin * MIN_MS;
    const prog = {
      horarios: (Array.isArray(p.horarios) ? p.horarios : []) as HorarioRonda[],
      diasSemana: p.diasSemana,
      vigenciaDesde: fecha(p.vigenciaDesde),
      vigenciaHasta: fecha(p.vigenciaHasta),
    };
    const pedidas = ocurrenciasProgramacion(
      prog,
      new Date(desde.getTime() - tol),
      new Date(hasta.getTime() - tol),
      zona,
    );
    const [primera, ultima] = [pedidas[0], pedidas.at(-1)];
    if (!primera || !ultima) continue;
    const inicios = await ctx.db.ejecucionRonda.findMany({
      where: {
        plantillaId: p.plantillaId,
        instalacionId: p.instalacionId,
        horaInicio: {
          gte: new Date(primera.getTime() - tol),
          lte: new Date(ultima.getTime() + tol),
        },
      },
      select: { horaInicio: true },
    });
    for (const o of pedidas) {
      if (inicios.some((e) => Math.abs(e.horaInicio.getTime() - o.getTime()) <= tol)) continue;
      senales.push({
        tipo: "rondas.ejecucion.no_realizada",
        entidadTipo: "programacion_ronda",
        entidadId: p.id,
        payload: {
          ...senalRonda(p.instalacionId, responsableUnico(p.responsables)),
          plantillaId: p.plantillaId,
          programadaPara: o.toISOString(),
        },
      });
    }
  }
  return senales;
}

/** Rondas iniciadas en las últimas horas, con lo que la vigilancia necesita para el atraso y los tramos. */
export async function rondasRecientes(ctx: Contexto, hasta: Date) {
  const filas = await ctx.db.ejecucionRonda.findMany({
    where: { horaInicio: { gte: new Date(hasta.getTime() - VENTANA_RONDA_MS), lt: hasta } },
    select: {
      id: true,
      instalacionId: true,
      plantillaId: true,
      personaId: true,
      horaInicio: true,
      cierre: { select: { horaCierre: true } },
      marcas: { select: { puntoId: true, horaCorregida: true } },
      plantilla: {
        select: {
          tiempoMaxMin: true,
          tiempoMaxTramoMin: true,
          puntos: {
            where: { obligatorio: true },
            orderBy: { orden: "asc" },
            select: { puntoId: true },
          },
        },
      },
    },
  });
  return filas.map((e) => ({
    base: { ...senalRonda(e.instalacionId, e.personaId), plantillaId: e.plantillaId },
    id: e.id,
    ronda: {
      inicio: e.horaInicio,
      cierre: e.cierre?.horaCierre ?? null,
      tiempoMaxMin: e.plantilla.tiempoMaxMin,
      tiempoMaxTramoMin: e.plantilla.tiempoMaxTramoMin,
      obligatorios: e.plantilla.puntos.map((x) => x.puntoId),
      marcas: e.marcas.map((m) => ({ puntoId: m.puntoId, hora: m.horaCorregida })),
    } satisfies RondaVigilada,
  }));
}
