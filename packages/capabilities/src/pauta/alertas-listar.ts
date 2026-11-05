import { z } from "zod";

import { calcularAlertasHoras, serieVigente, trabajaEn } from "@opai/domain";

import { vigenciasJornada } from "../core/turnos/comun";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { cargarSeriesDe } from "./cargar";
import { ajustesDeHoras } from "./ajustes";
import { aFechaDb, diaSchema, PERMISO_READ, hoy } from "./comun";
import { nombresDePersonas } from "./nombres";

const alertaSchema = z.object({
  personaId: z.string(),
  nombre: z.string(),
  tipo: z.enum(["semanal", "mensual", "descanso"]),
  severidad: z.enum(["advertencia", "critica"]),
  mensaje: z.string(),
  horas: z.number().optional(),
  limite: z.number().optional(),
});

const salidaSchema = z.object({
  instalacionId: z.string(),
  semanaDesde: z.string(),
  alertas: z.array(alertaSchema),
});

function inicioSemana(fecha: string): string {
  const n = Math.floor(Date.parse(`${fecha}T00:00:00Z`) / 86_400_000);
  const dow = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const iso = dow === 0 ? 7 : dow;
  return new Date((n - (iso - 1)) * 86_400_000).toISOString().slice(0, 10);
}

/** Lista alertas de horas legales de los guardias con turno en una instalación. */
export const alertasListar = defineCapability({
  id: "pauta.alertas.listar",
  descripcion:
    "Lista alertas de horas legales (semanal, mensual y descanso mínimo) para los guardias con turnos programados en una instalación, anclando la semana a una fecha opcional.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema, semana: diaSchema.optional() }),
  output: salidaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const inst = await ctx.db.instalacion.findFirst({
      where: { id: input.instalacionId, AND: [dondeInstalacion(ctx)] },
      select: { id: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    const puestos = await ctx.db.puesto.findMany({
      where: { instalacionId: inst.id, estado: "activo", AND: [dondePuesto(ctx)] },
      select: { id: true, horaInicio: true, horaFin: true },
    });
    const anchor = input.semana ?? (await hoy(ctx));
    const semanaDesde = inicioSemana(anchor);
    const semanaFin = new Date(Date.parse(`${semanaDesde}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
    const turnos: { personaId: string; fecha: string; horaInicio: string; horaFin: string }[] = [];
    // Lecturas por lote: series y excepciones de todos los puestos en una consulta cada una.
    const ids = puestos.map((p) => p.id);
    const seriesPorPuesto = await cargarSeriesDe(ctx, ids);
    const excepciones = ids.length
      ? await ctx.db.excepcionPauta.findMany({
          where: {
            puestoId: { in: ids },
            estado: "activa",
            fecha: { gte: aFechaDb(semanaDesde), lte: aFechaDb(semanaFin) },
          },
        })
      : [];
    for (const p of puestos) {
      const series = seriesPorPuesto.get(p.id) ?? [];
      const exc = excepciones.filter((x) => x.puestoId === p.id);
      for (let d = semanaDesde; d <= semanaFin; d = new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
        const vig = serieVigente(series, d);
        if (!vig) continue;
        const excDia = exc.find((x) => x.fecha.toISOString().slice(0, 10) === d);
        if (excDia?.tipo === "refuerzo" && excDia.personaId) {
          turnos.push({ personaId: excDia.personaId, fecha: d, horaInicio: p.horaInicio, horaFin: p.horaFin });
          continue;
        }
        if (!trabajaEn(vig.patron, vig.inicioCiclo, d)) continue;
        if (excDia?.tipo === "reemplazo" && excDia.personaId) {
          turnos.push({ personaId: excDia.personaId, fecha: d, horaInicio: p.horaInicio, horaFin: p.horaFin });
          continue;
        }
        if (excDia && ["ausencia", "licencia", "vacaciones", "permiso"].includes(excDia.tipo)) continue;
        if (vig.titularId)
          turnos.push({ personaId: vig.titularId, fecha: d, horaInicio: p.horaInicio, horaFin: p.horaFin });
      }
    }
    const [vigencias, limites] = await Promise.all([vigenciasJornada(ctx), ajustesDeHoras(ctx)]);
    const alertas = calcularAlertasHoras(turnos, anchor, { vigencias, ...limites });
    const nombres = await nombresDePersonas(ctx, alertas.map((a) => a.personaId));
    return {
      instalacionId: inst.id,
      semanaDesde,
      alertas: alertas.map((a) => ({
        ...a,
        nombre: nombres.get(a.personaId) ?? a.personaId,
      })),
    };
  },
});
