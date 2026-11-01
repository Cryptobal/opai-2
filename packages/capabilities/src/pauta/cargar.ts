import {
  expandirMes,
  fechasDelMesPauta,
  type CeldaPauta,
  type ExcepcionPauta,
  type OverlayRegistro,
  type PatronPauta,
  type SeriePauta,
} from "@opai/domain";

import type { Contexto } from "../types";
import { aFechaDb, fechaIso } from "./comun";
import { feriadosDelMes, type InstalacionBase } from "./feriados";


/** Serie de dominio con el patrón identificado, para la vista y para validar cambios. */
export type SerieCargada = SeriePauta & { patronId: string; patronNombre: string };

export type PuestoBase = { id: string; instalacionId: string };

export type MesCargado = {
  /** Celdas por puesto. */
  celdas: Map<string, CeldaPauta[]>;
  /** Serie vigente al cierre del mes por puesto (para la ficha); la última si hubo cambios. */
  series: Map<string, SerieCargada>;
  /** Feriados por instalación (fecha → nombre). */
  feriados: Map<string, Map<string, string>>;
};

type FilaSerie = Awaited<ReturnType<Contexto["db"]["seriePauta"]["findMany"]>>[number];

/** Series de dominio (con su patrón) agrupadas por puesto, en orden de vigencia. */
async function armarSeries(ctx: Contexto, filas: readonly FilaSerie[]): Promise<Map<string, SerieCargada[]>> {
  const patrones = new Map(
    (
      await ctx.db.patronTurno.findMany({
        where: { id: { in: [...new Set(filas.map((s) => s.patronId))] } },
      })
    ).map((p) => [p.id, p]),
  );
  const porPuesto = new Map<string, SerieCargada[]>();
  for (const s of filas) {
    const p = patrones.get(s.patronId);
    if (!p) continue;
    const patron: PatronPauta = {
      clase: p.clase === "semanal" ? "semanal" : "ciclico",
      diasTrabajo: p.diasTrabajo,
      diasDescanso: p.diasDescanso,
      diasSemana: p.diasSemana,
    };
    const lista = porPuesto.get(s.puestoId) ?? [];
    lista.push({
      id: s.id,
      puestoId: s.puestoId,
      patron,
      patronId: s.patronId,
      patronNombre: p.nombre,
      inicioCiclo: fechaIso(s.inicioCiclo),
      titularId: s.titularPersonaId,
      desde: fechaIso(s.vigenteDesde),
      hasta: s.vigenteHasta ? fechaIso(s.vigenteHasta) : null,
    });
    porPuesto.set(s.puestoId, lista);
  }
  return porPuesto;
}

function overlayDesdeRegistros(
  filas: readonly { fecha: Date; tipo: string; personaId: string | null }[],
): Map<string, OverlayRegistro> {
  const map = new Map<string, OverlayRegistro>();
  for (const r of filas) {
    const f = fechaIso(r.fecha);
    const prev = map.get(f) ?? {};
    if (r.tipo === "cobertura_confirmada") map.set(f, { ...prev, confirmado: true });
    else if (r.tipo === "marca_presencia") {
      map.set(f, { ...prev, marcaManual: true, ...(r.personaId ? { personaId: r.personaId } : {}) });
    }
  }
  return map;
}

/** Registros operativos activos de un puesto en un rango de fechas. */
export async function cargarRegistros(
  ctx: Contexto,
  puestoIds: readonly string[],
  primero: Date,
  ultimo: Date,
): Promise<Map<string, Map<string, OverlayRegistro>>> {
  const porPuesto = new Map<string, Map<string, OverlayRegistro>>();
  if (!puestoIds.length) return porPuesto;
  const filas = await ctx.db.registroOperativoPauta.findMany({
    where: {
      puestoId: { in: [...puestoIds] },
      estado: "activa",
      fecha: { gte: primero, lte: ultimo },
    },
  });
  for (const id of puestoIds) {
    porPuesto.set(id, overlayDesdeRegistros(filas.filter((x) => x.puestoId === id)));
  }
  return porPuesto;
}

/** Celda de un puesto en una fecha (serie + excepciones + registros del mes). */
export async function celdaDelDia(ctx: Contexto, puestoId: string, fecha: string): Promise<CeldaPauta> {
  const anio = Number(fecha.slice(0, 4));
  const mes = Number(fecha.slice(5, 7));
  const puesto = await ctx.db.puesto.findFirst({ where: { id: puestoId }, select: { id: true, instalacionId: true } });
  if (!puesto) throw new Error("puesto");
  const inst = await ctx.db.instalacion.findUnique({ where: { id: puesto.instalacionId }, select: { id: true, region: true } });
  const m = await cargarMes(ctx, [puesto], inst ? [inst] : [], anio, mes);
  return m.celdas.get(puestoId)?.find((c) => c.fecha === fecha) ?? { fecha, estado: "sin_serie", motivo: null, excepcion: false, feriado: null, titularId: null };
}

/** Todas las series de un puesto (pasadas, vigente y futuras), en orden de vigencia. */
export async function cargarSeries(ctx: Contexto, puestoId: string): Promise<SerieCargada[]> {
  const filas = await ctx.db.seriePauta.findMany({ where: { puestoId }, orderBy: { vigenteDesde: "asc" } });
  return (await armarSeries(ctx, filas)).get(puestoId) ?? [];
}

/** Carga series, excepciones y feriados de varios puestos y expande el mes de cada uno. */
export async function cargarMes(
  ctx: Contexto,
  puestos: readonly PuestoBase[],
  instalaciones: readonly InstalacionBase[],
  anio: number,
  mes: number,
): Promise<MesCargado> {
  const dias = fechasDelMesPauta(anio, mes);
  const primero = aFechaDb(dias[0]!);
  const ultimo = aFechaDb(dias[dias.length - 1]!);
  const ids = puestos.map((p) => p.id);
  const [filasSerie, filasExc, feriados, registrosPorPuesto] = await Promise.all([
    ids.length
      ? ctx.db.seriePauta.findMany({
          where: {
            puestoId: { in: ids },
            vigenteDesde: { lte: ultimo },
            OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: primero } }],
          },
          orderBy: { vigenteDesde: "asc" },
        })
      : [],
    ids.length
      ? ctx.db.excepcionPauta.findMany({
          where: { puestoId: { in: ids }, estado: "activa", fecha: { gte: primero, lte: ultimo } },
        })
      : [],
    feriadosDelMes(ctx, anio, mes, instalaciones),
    cargarRegistros(ctx, ids, primero, ultimo),
  ]);
  const seriesPorPuesto = await armarSeries(ctx, filasSerie);
  const excPorPuesto = new Map<string, ExcepcionPauta[]>();
  for (const x of filasExc) {
    const lista = excPorPuesto.get(x.puestoId) ?? [];
    lista.push({
      puestoId: x.puestoId,
      fecha: fechaIso(x.fecha),
      tipo: x.tipo as ExcepcionPauta["tipo"],
      motivo: x.motivo,
      personaId: x.personaId,
    });
    excPorPuesto.set(x.puestoId, lista);
  }
  const celdas = new Map<string, CeldaPauta[]>();
  const series = new Map<string, SerieCargada>();
  for (const p of puestos) {
    const lista = seriesPorPuesto.get(p.id) ?? [];
    const ultima = lista[lista.length - 1];
    if (ultima) series.set(p.id, ultima);
    const reg = registrosPorPuesto.get(p.id);
    celdas.set(
      p.id,
      expandirMes({
        anio,
        mes,
        series: lista,
        excepciones: excPorPuesto.get(p.id) ?? [],
        feriados: feriados.get(p.instalacionId) ?? new Map(),
        ...(reg ? { registros: reg } : {}),
      }),
    );
  }
  return { celdas, series, feriados };
}
