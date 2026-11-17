import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { dondeInstalacionId, PERMISO_READ } from "./comun";
import { derivarEstado, ejecucionDetalleSchema, iso } from "./ejecuciones-comun";

/** Detalle de una ronda con sus marcas y anomalías por punto. */
export const ejecucionesLeer = defineCapability({
  id: "rondas.ejecuciones.leer",
  descripcion:
    "Lee una ronda realizada con el detalle de cada punto marcado, la geocerca y las anomalías detectadas en la marca.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: ejecucionDetalleSchema,
  auditarLectura: (s) => [s.id],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { id }) {
    const e = await ctx.db.ejecucionRonda.findFirst({
      where: { id, ...dondeInstalacionId(ctx) },
      select: {
        id: true,
        instalacionId: true,
        plantillaId: true,
        adhoc: true,
        horaInicio: true,
        plantilla: { select: { nombre: true, tiempoMaxMin: true, puntos: { where: { obligatorio: true }, select: { id: true } } } },
        cierre: {
          select: {
            estado: true,
            horaCierre: true,
            puntosMarcados: true,
            puntosObligatorios: true,
            motivo: true,
          },
        },
        marcas: {
          orderBy: { horaCorregida: "asc" },
          select: {
            id: true,
            puntoId: true,
            horaCorregida: true,
            geocerca: true,
            anomalias: true,
          },
        },
      },
    });
    if (!e) throw noEncontrado("La ronda");
    const puntoIds = [...new Set(e.marcas.map((m) => m.puntoId))];
    const puntos = puntoIds.length
      ? await ctx.db.puntoControl.findMany({
          where: { id: { in: puntoIds }, ...dondeInstalacionId(ctx) },
          select: { id: true, nombre: true },
        })
      : [];
    const nombres = new Map(puntos.map((p) => [p.id, p.nombre]));
    const ahora = new Date();
    const oblig = e.cierre?.puntosObligatorios ?? e.plantilla.puntos.length;
    return {
      id: e.id,
      instalacionId: e.instalacionId,
      plantillaId: e.plantillaId,
      plantillaNombre: e.plantilla.nombre,
      adhoc: e.adhoc,
      estado: derivarEstado(e.cierre, e.horaInicio, e.plantilla.tiempoMaxMin, ahora),
      horaInicio: iso(e.horaInicio),
      horaCierre: e.cierre ? iso(e.cierre.horaCierre) : null,
      puntosMarcados: e.cierre?.puntosMarcados ?? e.marcas.length,
      puntosObligatorios: oblig,
      anomalias: e.marcas.reduce((n, m) => n + m.anomalias.length, 0),
      motivoCierre: e.cierre?.motivo ?? null,
      marcas: e.marcas.map((m) => ({
        id: m.id,
        puntoId: m.puntoId,
        puntoNombre: nombres.get(m.puntoId) ?? "Punto",
        hora: iso(m.horaCorregida),
        geocerca: m.geocerca,
        anomalias: m.anomalias,
      })),
    };
  },
});