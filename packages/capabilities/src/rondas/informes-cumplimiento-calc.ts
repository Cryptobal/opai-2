import { dondeInstalacion } from "../core/maestros/alcance";
import type { Contexto } from "../types";
import { dondeInstalacionId } from "./comun";
import { derivarEstado, type EstadoEjecucion } from "./ejecuciones-comun";
import { slotsNoRealizados } from "./programacion-slots";

type Contadores = { r: number; c: number; i: number; a: number; n: number };

function rangoDelMes(anio: number, mes: number): { desde: string; hasta: string } {
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hasta =
    mes === 12
      ? `${anio}-12-31`
      : new Date(Date.parse(`${anio}-${String(mes + 1).padStart(2, "0")}-01T00:00:00.000Z`) - 1)
          .toISOString()
          .slice(0, 10);
  return { desde, hasta };
}

function sumarEjecucion(b: Contadores, est: EstadoEjecucion) {
  b.r += 1;
  if (est === "completada" || est === "cerrada_auto" || est === "cerrada_admin") b.c += 1;
  else if (est === "incompleta") b.i += 1;
  else if (est === "atrasada" || est === "en_curso") b.a += 1;
}

function filasPorInstalacion(
  instalaciones: { id: string; nombre: string; cuenta: { nombre: string } }[],
  porInst: Map<string, Contadores>,
) {
  return instalaciones.map((ins) => {
    const s = porInst.get(ins.id) ?? { r: 0, c: 0, i: 0, a: 0, n: 0 };
    return {
      instalacionId: ins.id,
      instalacion: ins.nombre,
      cuenta: ins.cuenta.nombre,
      realizadas: s.r,
      completadas: s.c,
      incompletas: s.i,
      atrasadas: s.a,
      noRealizadas: s.n,
    };
  });
}

export async function calcularCumplimientoMes(
  ctx: Contexto,
  p: { anio: number; mes: number; instalacionId?: string },
) {
  const { anio, mes, instalacionId } = p;
  const { desde, hasta } = rangoDelMes(anio, mes);
  const instalaciones = await ctx.db.instalacion.findMany({
    where: {
      archivadaEn: null,
      ...dondeInstalacion(ctx),
      ...(instalacionId ? { id: instalacionId } : {}),
    },
    select: { id: true, nombre: true, cuenta: { select: { nombre: true } } },
  });
  const ahora = new Date();
  const filas = await ctx.db.ejecucionRonda.findMany({
    where: {
      ...dondeInstalacionId(ctx),
      ...(instalacionId ? { instalacionId } : {}),
      horaInicio: {
        gte: new Date(`${desde}T00:00:00.000Z`),
        lte: new Date(`${hasta}T23:59:59.999Z`),
      },
    },
    select: {
      instalacionId: true,
      horaInicio: true,
      plantilla: { select: { tiempoMaxMin: true } },
      cierre: { select: { estado: true, horaCierre: true, puntosMarcados: true, puntosObligatorios: true, motivo: true } },
    },
  });
  const faltantes = await slotsNoRealizados(ctx, { ...(instalacionId ? { instalacionId } : {}), desde, hasta });
  const porInst = new Map<string, Contadores>();
  for (const i of instalaciones) porInst.set(i.id, { r: 0, c: 0, i: 0, a: 0, n: 0 });
  for (const e of filas) {
    const b = porInst.get(e.instalacionId);
    if (!b) continue;
    sumarEjecucion(b, derivarEstado(e.cierre, e.horaInicio, e.plantilla.tiempoMaxMin, ahora));
  }
  for (const f of faltantes) {
    const b = porInst.get(f.instalacionId);
    if (b) b.n += 1;
  }
  return { anio, mes, instalaciones: filasPorInstalacion(instalaciones, porInst) };
}