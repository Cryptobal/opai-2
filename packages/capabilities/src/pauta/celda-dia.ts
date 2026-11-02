import type { CeldaPauta } from "@opai/domain";

import type { Contexto } from "../types";
import { cargarMes } from "./cargar";

/** Celda de un puesto en una fecha (serie + excepciones + registros del mes). */
export async function celdaDelDia(ctx: Contexto, puestoId: string, fecha: string): Promise<CeldaPauta> {
  const anio = Number(fecha.slice(0, 4));
  const mes = Number(fecha.slice(5, 7));
  const puesto = await ctx.db.puesto.findFirst({ where: { id: puestoId }, select: { id: true, instalacionId: true } });
  if (!puesto) throw new Error("puesto");
  const inst = await ctx.db.instalacion.findUnique({ where: { id: puesto.instalacionId }, select: { id: true, region: true } });
  const m = await cargarMes(ctx, [puesto], inst ? [inst] : [], anio, mes);
  return (
    m.celdas.get(puestoId)?.find((c) => c.fecha === fecha) ?? {
      fecha,
      estado: "sin_serie",
      motivo: null,
      excepcion: false,
      feriado: null,
      titularId: null,
    }
  );
}
