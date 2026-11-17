import type { Contexto } from "../types";
import { dondeInstalacionId } from "./comun";
import { type EstadoEjecucion, iso } from "./ejecuciones-comun";
import { horariosSchema } from "./vistas";

const MAX_DIAS = 31;

function diasEnRango(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let d = new Date(`${desde}T00:00:00.000Z`);
  const fin = new Date(`${hasta}T00:00:00.000Z`);
  while (d <= fin && out.length < MAX_DIAS) {
    out.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 86_400_000);
  }
  return out;
}

function horasDeProgramacion(raw: unknown): string[] {
  const parsed = horariosSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.filter((h): h is string => typeof h === "string");
}

/** Ventanas programadas sin ejecución iniciada (estado no_realizada). */
export async function slotsNoRealizados(
  ctx: Contexto,
  op: { instalacionId?: string; desde?: string; hasta?: string },
): Promise<
  {
    id: string;
    instalacionId: string;
    plantillaId: string;
    plantillaNombre: string;
    adhoc: boolean;
    estado: EstadoEjecucion;
    horaInicio: string | null;
    horaCierre: string | null;
    puntosMarcados: number;
    puntosObligatorios: number;
    anomalias: number;
  }[]
> {
  const hasta = op.hasta ?? new Date().toISOString().slice(0, 10);
  const desde = op.desde ?? hasta;
  const dias = diasEnRango(desde, hasta);
  if (dias.length === 0) return [];
  const programaciones = await ctx.db.programacion.findMany({
    where: {
      estado: "activa",
      ...dondeInstalacionId(ctx),
      ...(op.instalacionId ? { instalacionId: op.instalacionId } : {}),
    },
    select: {
      id: true,
      instalacionId: true,
      plantillaId: true,
      nombre: true,
      horarios: true,
      diasSemana: true,
      toleranciaMin: true,
      vigenciaDesde: true,
      vigenciaHasta: true,
      plantilla: { select: { nombre: true, tiempoMaxMin: true, puntos: { where: { obligatorio: true }, select: { id: true } } } },
    },
  });
  if (programaciones.length === 0) return [];
  const ini = new Date(`${desde}T00:00:00.000Z`);
  const fin = new Date(`${hasta}T23:59:59.999Z`);
  const ejecutadas = await ctx.db.ejecucionRonda.findMany({
    where: {
      ...dondeInstalacionId(ctx),
      ...(op.instalacionId ? { instalacionId: op.instalacionId } : {}),
      horaInicio: { gte: ini, lte: fin },
    },
    select: { plantillaId: true, horaInicio: true },
  });
  const out: Awaited<ReturnType<typeof slotsNoRealizados>> = [];
  for (const dia of dias) {
    const dow = new Date(`${dia}T12:00:00.000Z`).getUTCDay();
    for (const p of programaciones) {
      if (p.diasSemana.length > 0 && !p.diasSemana.includes(dow)) continue;
      if (p.vigenciaDesde && dia < p.vigenciaDesde.toISOString().slice(0, 10)) continue;
      if (p.vigenciaHasta && dia > p.vigenciaHasta.toISOString().slice(0, 10)) continue;
      for (const hhmm of horasDeProgramacion(p.horarios)) {
        const slot = new Date(`${dia}T${hhmm}:00.000Z`);
        const tolMs = p.toleranciaMin * 60_000;
        const ventanaFin = slot.getTime() + tolMs + p.plantilla.tiempoMaxMin * 60_000;
        const cubierta = ejecutadas.some(
          (e) =>
            e.plantillaId === p.plantillaId &&
            e.horaInicio.getTime() >= slot.getTime() - tolMs &&
            e.horaInicio.getTime() <= ventanaFin,
        );
        if (!cubierta && slot.getTime() + tolMs < Date.now()) {
          const id = `nr:${p.id}:${dia}:${hhmm}`;
          out.push({
            id,
            instalacionId: p.instalacionId,
            plantillaId: p.plantillaId,
            plantillaNombre: p.plantilla.nombre,
            adhoc: false,
            estado: "no_realizada",
            horaInicio: iso(slot),
            horaCierre: null,
            puntosMarcados: 0,
            puntosObligatorios: p.plantilla.puntos.length,
            anomalias: 0,
          });
        }
      }
    }
  }
  out.sort((a, b) => (b.horaInicio ?? "").localeCompare(a.horaInicio ?? ""));
  return out;
}